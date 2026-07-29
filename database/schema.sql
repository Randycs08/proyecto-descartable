-- =====================================================================
--  SISTEMA DE VENTA DE DESCARTABLES
--  Esquema de base de datos (MySQL 8.0+)
--
--  Motor:        InnoDB (integridad referencial + transacciones)
--  Codificación: utf8mb4 / utf8mb4_unicode_ci
--
--  Convenciones:
--    - PK           : columna `id` autoincremental sin signo.
--    - FK           : <tabla_singular>_id (ej. categoria_id).
--    - Timestamps   : created_at / updated_at automáticos.
--    - Borrado      : RESTRICT por defecto; CASCADE solo donde el hijo
--                     carece de sentido sin el padre (ej. detalle_pedido).
-- =====================================================================

CREATE DATABASE IF NOT EXISTS descartables
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE descartables;

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================================
--  1. ROLES
--     Perfiles de acceso del panel administrativo.
-- =====================================================================
CREATE TABLE IF NOT EXISTS roles (
  id            TINYINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(50)        NOT NULL,
  descripcion   VARCHAR(255)       DEFAULT NULL,
  created_at    TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  2. USUARIOS
--     Personal interno (administradores, vendedores) que accede al panel.
-- =====================================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id            INT UNSIGNED       NOT NULL AUTO_INCREMENT,
  rol_id        TINYINT UNSIGNED   NOT NULL,
  nombre        VARCHAR(100)       NOT NULL,
  apellido      VARCHAR(100)       DEFAULT NULL,
  email         VARCHAR(150)       NOT NULL,
  password_hash VARCHAR(255)       NOT NULL,
  telefono      VARCHAR(30)        DEFAULT NULL,
  activo        BOOLEAN            NOT NULL DEFAULT TRUE,
  ultimo_acceso DATETIME           DEFAULT NULL,
  created_at    TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email),
  KEY idx_usuarios_rol (rol_id),
  CONSTRAINT fk_usuarios_rol
    FOREIGN KEY (rol_id) REFERENCES roles (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  3. CATEGORIAS
--     Agrupación de productos (platos, vasos, cubiertos, bolsas, etc.).
-- =====================================================================
CREATE TABLE IF NOT EXISTS categorias (
  id            INT UNSIGNED       NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(120)       NOT NULL,
  slug          VARCHAR(140)       NOT NULL,
  descripcion   VARCHAR(500)       DEFAULT NULL,
  imagen_url    VARCHAR(255)       DEFAULT NULL,
  orden         SMALLINT UNSIGNED  NOT NULL DEFAULT 0,
  activo        BOOLEAN            NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categorias_nombre (nombre),
  UNIQUE KEY uq_categorias_slug (slug),
  KEY idx_categorias_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  4. MARCAS
--     Fabricantes / marcas comerciales de los productos.
-- =====================================================================
CREATE TABLE IF NOT EXISTS marcas (
  id            INT UNSIGNED       NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(120)       NOT NULL,
  slug          VARCHAR(140)       NOT NULL,
  descripcion   VARCHAR(500)       DEFAULT NULL,
  logo_url      VARCHAR(255)       DEFAULT NULL,
  activo        BOOLEAN            NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_marcas_nombre (nombre),
  UNIQUE KEY uq_marcas_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  5. PROVEEDORES
--     Empresas a las que se compra la mercadería.
-- =====================================================================
CREATE TABLE IF NOT EXISTS proveedores (
  id             INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  nombre         VARCHAR(150)      NOT NULL,
  razon_social   VARCHAR(180)      DEFAULT NULL,
  cuit           VARCHAR(20)       DEFAULT NULL,   -- CUIT / RUC / identificación fiscal
  contacto_nombre VARCHAR(120)     DEFAULT NULL,
  email          VARCHAR(150)      DEFAULT NULL,
  telefono       VARCHAR(30)       DEFAULT NULL,
  direccion      VARCHAR(255)      DEFAULT NULL,
  ciudad         VARCHAR(100)      DEFAULT NULL,
  provincia      VARCHAR(100)      DEFAULT NULL,
  notas          TEXT              DEFAULT NULL,
  activo         BOOLEAN           NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_proveedores_cuit (cuit),
  KEY idx_proveedores_nombre (nombre),
  KEY idx_proveedores_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  6. PRODUCTOS
--     Catálogo. Relacionado con categoría, marca y proveedor.
-- =====================================================================
CREATE TABLE IF NOT EXISTS productos (
  id                  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  sku                 VARCHAR(50)   NOT NULL,           -- código interno
  nombre              VARCHAR(180)  NOT NULL,
  slug                VARCHAR(200)  NOT NULL,
  descripcion         TEXT          DEFAULT NULL,
  categoria_id        INT UNSIGNED  NOT NULL,
  marca_id            INT UNSIGNED  DEFAULT NULL,
  proveedor_id        INT UNSIGNED  DEFAULT NULL,
  precio              DECIMAL(10,2) NOT NULL DEFAULT 0.00,   -- precio de venta
  precio_costo        DECIMAL(10,2) DEFAULT NULL,            -- costo de compra
  stock               INT           NOT NULL DEFAULT 0,
  stock_minimo        INT           NOT NULL DEFAULT 0,
  unidad_medida       VARCHAR(30)   NOT NULL DEFAULT 'unidad', -- unidad, paquete, caja, kg...
  unidades_por_paquete INT UNSIGNED DEFAULT NULL,
  imagen_url          VARCHAR(255)  DEFAULT NULL,
  destacado           BOOLEAN       NOT NULL DEFAULT FALSE,
  activo              BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_productos_sku (sku),
  UNIQUE KEY uq_productos_slug (slug),
  KEY idx_productos_categoria (categoria_id),
  KEY idx_productos_marca (marca_id),
  KEY idx_productos_proveedor (proveedor_id),
  KEY idx_productos_activo (activo),
  KEY idx_productos_destacado (destacado),
  CONSTRAINT fk_productos_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_productos_marca
    FOREIGN KEY (marca_id) REFERENCES marcas (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_productos_proveedor
    FOREIGN KEY (proveedor_id) REFERENCES proveedores (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_productos_precio   CHECK (precio >= 0),
  CONSTRAINT chk_productos_stock    CHECK (stock >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  7. CLIENTES
--     Compradores (consumidor final o empresa).
-- =====================================================================
CREATE TABLE IF NOT EXISTS clientes (
  id             INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  nombre         VARCHAR(120)      NOT NULL,
  apellido       VARCHAR(120)      DEFAULT NULL,
  razon_social   VARCHAR(180)      DEFAULT NULL,        -- para clientes empresa
  tipo_documento ENUM('DNI','CUIT','CUIL','RUC','PASAPORTE','OTRO')
                                   NOT NULL DEFAULT 'DNI',
  documento      VARCHAR(30)       DEFAULT NULL,
  email          VARCHAR(150)      DEFAULT NULL,
  telefono       VARCHAR(30)       DEFAULT NULL,
  direccion      VARCHAR(255)      DEFAULT NULL,
  ciudad         VARCHAR(100)      DEFAULT NULL,
  provincia      VARCHAR(100)      DEFAULT NULL,
  codigo_postal  VARCHAR(15)       DEFAULT NULL,
  activo         BOOLEAN           NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clientes_documento (tipo_documento, documento),
  KEY idx_clientes_email (email),
  KEY idx_clientes_nombre (nombre, apellido)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  8. PEDIDOS
--     Cabecera de la venta. Totales se calculan a partir del detalle.
-- =====================================================================
CREATE TABLE IF NOT EXISTS pedidos (
  id             INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  numero         VARCHAR(20)       NOT NULL,            -- nº de pedido legible
  cliente_id     INT UNSIGNED      NOT NULL,
  usuario_id     INT UNSIGNED      DEFAULT NULL,        -- vendedor que lo cargó
  estado         ENUM('pendiente','confirmado','en_proceso','enviado','entregado','cancelado')
                                   NOT NULL DEFAULT 'pendiente',
  metodo_pago    ENUM('efectivo','transferencia','tarjeta','mercadopago',
                      'cuenta_corriente','otro','yape','plin')
                                   NOT NULL DEFAULT 'efectivo',
  estado_pago    ENUM('pendiente','parcial','pagado','reembolsado')
                                   NOT NULL DEFAULT 'pendiente',
  subtotal       DECIMAL(12,2)     NOT NULL DEFAULT 0.00,
  descuento      DECIMAL(12,2)     NOT NULL DEFAULT 0.00,
  impuestos      DECIMAL(12,2)     NOT NULL DEFAULT 0.00,
  total          DECIMAL(12,2)     NOT NULL DEFAULT 0.00,
  direccion_entrega VARCHAR(255)   DEFAULT NULL,   -- calle y número
  distrito       VARCHAR(100)      DEFAULT NULL,   -- para agrupar entregas por zona
  referencia_entrega VARCHAR(255)  DEFAULT NULL,   -- "frente al parque", etc.
  notas          TEXT              DEFAULT NULL,
  fecha_pedido   DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at     TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pedidos_numero (numero),
  KEY idx_pedidos_cliente (cliente_id),
  KEY idx_pedidos_usuario (usuario_id),
  KEY idx_pedidos_estado (estado),
  KEY idx_pedidos_fecha (fecha_pedido),
  KEY idx_pedidos_distrito (distrito),
  CONSTRAINT fk_pedidos_cliente
    FOREIGN KEY (cliente_id) REFERENCES clientes (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_pedidos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_pedidos_total CHECK (total >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  9. DETALLE_PEDIDO
--     Líneas de cada pedido. Guarda el precio como "foto" al momento
--     de la venta (no depende de cambios futuros en productos).
-- =====================================================================
CREATE TABLE IF NOT EXISTS detalle_pedido (
  id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  pedido_id       INT UNSIGNED     NOT NULL,
  producto_id     INT UNSIGNED     NOT NULL,
  descripcion     VARCHAR(180)     DEFAULT NULL,        -- nombre del producto al vender
  cantidad        INT UNSIGNED     NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(10,2)    NOT NULL DEFAULT 0.00,
  descuento       DECIMAL(10,2)    NOT NULL DEFAULT 0.00,
  subtotal        DECIMAL(12,2)    NOT NULL DEFAULT 0.00,
  created_at      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_detalle_pedido_producto (pedido_id, producto_id),
  KEY idx_detalle_pedido (pedido_id),
  KEY idx_detalle_producto (producto_id),
  CONSTRAINT fk_detalle_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto
    FOREIGN KEY (producto_id) REFERENCES productos (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  10. MOVIMIENTOS_INVENTARIO
--      Historial de entradas / salidas / ajustes de stock. Auditoría.
-- =====================================================================
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id             BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  producto_id    INT UNSIGNED      NOT NULL,
  tipo           ENUM('entrada','salida','ajuste') NOT NULL,
  cantidad       INT               NOT NULL,           -- unidades del movimiento
  stock_anterior INT               NOT NULL,
  stock_nuevo    INT               NOT NULL,
  motivo         VARCHAR(180)      DEFAULT NULL,        -- compra, venta, merma, ajuste...
  proveedor_id   INT UNSIGNED      DEFAULT NULL,        -- origen (para entradas)
  pedido_id      INT UNSIGNED      DEFAULT NULL,        -- referencia (para salidas)
  usuario_id     INT UNSIGNED      DEFAULT NULL,        -- quién lo registró
  created_at     TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mov_producto (producto_id),
  KEY idx_mov_tipo (tipo),
  KEY idx_mov_fecha (created_at),
  KEY idx_mov_proveedor (proveedor_id),
  KEY idx_mov_pedido (pedido_id),
  CONSTRAINT fk_mov_producto
    FOREIGN KEY (producto_id) REFERENCES productos (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_mov_proveedor
    FOREIGN KEY (proveedor_id) REFERENCES proveedores (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_mov_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_mov_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  11. CONTACTO
--      Mensajes enviados desde el formulario de contacto del sitio.
-- =====================================================================
CREATE TABLE IF NOT EXISTS contacto (
  id          INT UNSIGNED         NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(120)         NOT NULL,
  email       VARCHAR(150)         NOT NULL,
  telefono    VARCHAR(30)          DEFAULT NULL,
  asunto      VARCHAR(180)         DEFAULT NULL,
  mensaje     TEXT                 NOT NULL,
  leido       BOOLEAN              NOT NULL DEFAULT FALSE,
  ip          VARCHAR(45)          DEFAULT NULL,
  created_at  TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contacto_leido (leido),
  KEY idx_contacto_fecha (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  12. VISITAS
--      Registro de tráfico del sitio para estadísticas simples.
-- =====================================================================
CREATE TABLE IF NOT EXISTS visitas (
  id          BIGINT UNSIGNED      NOT NULL AUTO_INCREMENT,
  ip          VARCHAR(45)          DEFAULT NULL,        -- soporta IPv6
  user_agent  VARCHAR(255)         DEFAULT NULL,
  pagina      VARCHAR(255)         DEFAULT NULL,
  referer     VARCHAR(255)         DEFAULT NULL,
  pais        VARCHAR(80)          DEFAULT NULL,
  created_at  TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_visitas_fecha (created_at),
  KEY idx_visitas_pagina (pagina)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  13. CONFIGURACION
--      Datos generales de la empresa. Tabla de fila única (id = 1).
-- =====================================================================
CREATE TABLE IF NOT EXISTS configuracion (
  id             TINYINT UNSIGNED  NOT NULL DEFAULT 1,
  nombre_empresa VARCHAR(150)      NOT NULL DEFAULT '',
  logo_url       VARCHAR(255)      DEFAULT NULL,
  email          VARCHAR(150)      DEFAULT NULL,
  telefono       VARCHAR(30)       DEFAULT NULL,
  whatsapp       VARCHAR(30)       DEFAULT NULL,
  direccion      VARCHAR(255)      DEFAULT NULL,
  ciudad         VARCHAR(100)      DEFAULT NULL,
  provincia      VARCHAR(100)      DEFAULT NULL,
  horario_atencion VARCHAR(180)    DEFAULT NULL,
  facebook       VARCHAR(255)      DEFAULT NULL,
  instagram      VARCHAR(255)      DEFAULT NULL,
  twitter        VARCHAR(255)      DEFAULT NULL,
  tiktok         VARCHAR(255)      DEFAULT NULL,
  moneda         VARCHAR(10)       NOT NULL DEFAULT 'ARS',
  created_at     TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_configuracion_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  14. CHECKOUT_IDEMPOTENCIA
--      Una fila por intento de compra del sitio público, para que un doble
--      envío no genere dos pedidos. Ver migración 002.
--
--      La clave se reserva como primera operación de la transacción del
--      pedido: la PRIMARY KEY bloquea a la segunda solicitud antes de que
--      llegue a descontar stock. `pedido_id` admite NULL porque en ese
--      instante el pedido todavía no existe; se completa con un UPDATE
--      antes de confirmar. Si la transacción revierte, la reserva
--      desaparece con ella y la clave se puede reintentar.
-- =====================================================================
CREATE TABLE IF NOT EXISTS checkout_idempotencia (
  clave       VARCHAR(64)          NOT NULL,
  pedido_id   INT UNSIGNED         DEFAULT NULL,
  created_at  TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (clave),
  KEY idx_checkout_idem_pedido (pedido_id),
  KEY idx_checkout_idem_fecha (created_at),
  CONSTRAINT fk_checkout_idem_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
--  FIN DEL ESQUEMA
-- =====================================================================
