-- =====================================================================
--  Migración 002 — Idempotencia del checkout público
--  Fecha: 2026-07-28
-- =====================================================================
--
--  QUÉ RESUELVE
--
--  Dos solicitudes simultáneas del mismo checkout creaban DOS pedidos y
--  descontaban el stock dos veces. Pasa con un doble clic que esquive el botón
--  deshabilitado, con dos pestañas abiertas, con un reintento del navegador o
--  con cualquiera que llame la API directamente.
--
--  CÓMO FUNCIONA
--
--  El sitio manda una clave por intento de compra (cabecera Idempotency-Key).
--  El servidor la RESERVA en esta tabla como primera operación de la transacción
--  del pedido, antes de tocar clientes, stock o movimientos. La PRIMARY KEY es
--  todo el mecanismo:
--
--    · Dos solicitudes a la vez -> la segunda queda BLOQUEADA por el índice
--      antes de hacer nada, hasta que la primera confirme o revierta.
--    · Si la primera confirma  -> la segunda recibe ER_DUP_ENTRY, lee esta fila
--      y devuelve el pedido que ya existe. El stock se descontó una sola vez.
--    · Si la primera falla     -> la transacción revierte y la reserva se va con
--      ella, así que la misma clave se puede reintentar sin quedar "quemada".
--
--  POR QUÉ pedido_id ADMITE NULL
--
--  La reserva se inserta ANTES de que el pedido exista, así que en ese instante
--  todavía no hay id que apuntar; se completa con un UPDATE al final de la misma
--  transacción. Es deliberado: si se insertara después del pedido, la segunda
--  solicitud alcanzaría a descontar stock antes de chocar con la clave y podría
--  fallar por "stock insuficiente" en lugar de devolver el pedido de la primera.
--
--  Consecuencia: una fila CONFIRMADA siempre tiene pedido_id. Un NULL visible
--  solo puede ser una transacción en curso, nunca un estado final.
--
--  Al vivir en la base y no en memoria, la protección sobrevive a un reinicio y
--  funciona con varias instancias del servidor.
--
--  Es idempotente: se puede correr dos veces sin error.
-- =====================================================================

USE descartables;

SET @existe := (
  SELECT COUNT(*) FROM information_schema.TABLES
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'checkout_idempotencia'
);

SET @sql := IF(@existe = 0, '
CREATE TABLE checkout_idempotencia (
  clave       VARCHAR(64)   NOT NULL,
  pedido_id   INT UNSIGNED  DEFAULT NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (clave),
  KEY idx_checkout_idem_pedido (pedido_id),
  KEY idx_checkout_idem_fecha (created_at),
  CONSTRAINT fk_checkout_idem_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
--  Notas
-- ---------------------------------------------------------------------
--  ON DELETE CASCADE: si se borra un pedido, su clave se va con él. Sin eso la
--  clave quedaría apuntando a la nada y bloquearía un reintento legítimo.
--
--  Las filas se acumulan (una por pedido web). No se agrega purga automática en
--  esta migración: sería una tarea programada, es decir funcionalidad nueva. Con
--  el volumen de una tienda chica no es un problema; si algún día lo fuera, se
--  borran por `created_at` con más de N meses (de ahí idx_checkout_idem_fecha).
--
--  Los pedidos cargados desde el panel NO pasan por acá: la idempotencia es del
--  checkout público, donde el que envía es un navegador que puede reintentar.

SELECT COUNT(*) AS claves_registradas FROM checkout_idempotencia;
