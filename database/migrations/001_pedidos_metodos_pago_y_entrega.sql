-- =====================================================================
--  Migración 001 — Pedidos: métodos de pago locales y entrega desglosada
--  Fecha: 2026-07-27
-- =====================================================================
--
--  QUÉ RESUELVE
--
--  1. `metodo_pago` no contemplaba Yape ni Plin, que son los medios que se
--     usan en Perú. El checkout público los guardaba como 'otro' y anotaba el
--     medio real en las notas, así que el dato quedaba en texto libre y no se
--     podía filtrar ni sumar por método.
--
--  2. El distrito y la referencia de entrega se concatenaban dentro de
--     `direccion_entrega` con el formato "{direccion}, {distrito} (Ref: {ref})".
--     Un dato compuesto no se puede consultar: no hay forma de listar los
--     pedidos de un distrito sin salir a partir cadenas.
--
--  COMPATIBILIDAD
--
--  Solo se AGREGAN valores al ENUM y columnas NULL. Ningún valor existente se
--  elimina ni se renombra, y ninguna columna cambia de tipo, así que los
--  pedidos ya cargados se siguen leyendo igual.
--
--  Es idempotente: se puede correr dos veces sin error.
-- =====================================================================

USE descartables;

-- ---------------------------------------------------------------------
--  1. ENUM: se agregan 'yape' y 'plin' al final
-- ---------------------------------------------------------------------
--  Los seis valores anteriores se repiten en el mismo orden. MySQL guarda el
--  ENUM por posición, así que alterar ese orden reasignaría el método de cada
--  pedido ya cargado. Agregar al final es la única forma segura.
ALTER TABLE pedidos
  MODIFY COLUMN metodo_pago
    ENUM('efectivo','transferencia','tarjeta','mercadopago',
         'cuenta_corriente','otro','yape','plin')
    NOT NULL DEFAULT 'efectivo';

-- ---------------------------------------------------------------------
--  2. Columnas de entrega
-- ---------------------------------------------------------------------
--  NULL y sin valor por defecto: un pedido cargado desde el panel puede no
--  tener distrito, y NULL dice "no se cargó", que es distinto de "vacío".
--  Los tamaños acompañan a los del cliente (clientes.ciudad es VARCHAR(100)).
SET @existe_distrito := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pedidos' AND COLUMN_NAME = 'distrito'
);
SET @sql := IF(@existe_distrito = 0,
  'ALTER TABLE pedidos ADD COLUMN distrito VARCHAR(100) NULL AFTER direccion_entrega',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @existe_referencia := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pedidos' AND COLUMN_NAME = 'referencia_entrega'
);
SET @sql := IF(@existe_referencia = 0,
  'ALTER TABLE pedidos ADD COLUMN referencia_entrega VARCHAR(255) NULL AFTER distrito',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Índice para poder listar/agrupar por distrito sin recorrer la tabla entera.
SET @existe_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pedidos' AND INDEX_NAME = 'idx_pedidos_distrito'
);
SET @sql := IF(@existe_idx = 0,
  'ALTER TABLE pedidos ADD KEY idx_pedidos_distrito (distrito)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
--  3. Datos existentes: SOLO el método de pago
-- ---------------------------------------------------------------------
--  El checkout público escribía en las notas la línea exacta
--  "[Pedido web] · Pago: Yape" o "... · Pago: Plin". Ese texto lo generó el
--  servidor, no una persona, así que reconocerlo no es interpretar nada: es
--  leer un marcador. Solo se tocan los pedidos que están en 'otro' y traen ese
--  marcador; cualquier otro 'otro' (cargado a mano desde el panel) se respeta.
UPDATE pedidos
   SET metodo_pago = 'yape'
 WHERE metodo_pago = 'otro'
   AND notas LIKE '[Pedido web] · Pago: Yape%';

UPDATE pedidos
   SET metodo_pago = 'plin'
 WHERE metodo_pago = 'otro'
   AND notas LIKE '[Pedido web] · Pago: Plin%';

-- ---------------------------------------------------------------------
--  4. Lo que NO se migra, y por qué
-- ---------------------------------------------------------------------
--  `direccion_entrega` NO se parte para llenar `distrito` ni
--  `referencia_entrega`. Partir por comas obligaría a adivinar dónde termina la
--  calle y empieza el distrito, y una dirección real trae comas propias
--  ("Av. Arequipa 1234, Piso 3, Miraflores"). Peor todavía: los pedidos
--  cargados desde el panel nunca tuvieron ese formato, ahí el campo es texto
--  libre. Una separación mal hecha ensuciaría datos que hoy son correctos.
--
--  Los pedidos anteriores conservan la dirección completa en
--  `direccion_entrega` y quedan con distrito y referencia en NULL. La ficha del
--  pedido contempla ambos casos: muestra las columnas nuevas cuando existen y
--  la dirección completa siempre.
--
--  Si más adelante se quisiera desglosar, corresponde hacerlo a mano desde el
--  panel, que es donde alguien puede mirar cada dirección y decidir.

-- ---------------------------------------------------------------------
--  Verificación
-- ---------------------------------------------------------------------
SELECT metodo_pago, COUNT(*) AS pedidos
  FROM pedidos
 GROUP BY metodo_pago
 ORDER BY pedidos DESC;
