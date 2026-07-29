-- =====================================================================
--  SISTEMA DE VENTA DE DESCARTABLES
--  Datos iniciales (seed)
--
--  Requisito: ejecutar primero database/schema.sql
--  Uso:       mysql -u root -p descartables < database/seeds/seed.sql
--
--  Diseño idempotente: puede ejecutarse varias veces sin duplicar datos
--  (INSERT IGNORE / ON DUPLICATE KEY UPDATE sobre claves únicas).
--
--  Credenciales de acceso del administrador:
--    email:      admin@descartables.com
--    contraseña: Admin123*      (hash bcrypt, cost 10)
--  >>> Cambiar esta contraseña en producción. <<<
-- =====================================================================

USE descartables;

-- ---------------------------------------------------------------------
--  ROLES
-- ---------------------------------------------------------------------
INSERT IGNORE INTO roles (id, nombre, descripcion) VALUES
  (1, 'Administrador', 'Acceso total al sistema y la configuración.'),
  (2, 'Empleado',      'Gestión de catálogo, stock y pedidos.'),
  (3, 'Vendedor',      'Registro de pedidos y atención de clientes.');

-- ---------------------------------------------------------------------
--  USUARIO ADMINISTRADOR
--  Contraseña 'Admin123*' hasheada con bcrypt (cost 10).
-- ---------------------------------------------------------------------
INSERT IGNORE INTO usuarios (rol_id, nombre, apellido, email, password_hash, activo) VALUES
  (1, 'Administrador', 'Principal', 'admin@descartables.com',
   '$2b$10$h4lUHgm.ps7ExM22FEhj2O9AiDSrZ4CxdBzMnv7c2UVByLiSc/CrW', TRUE);

-- ---------------------------------------------------------------------
--  CONFIGURACIÓN DE LA EMPRESA (fila única id = 1)
-- ---------------------------------------------------------------------
INSERT INTO configuracion
  (id, nombre_empresa, logo_url, direccion, ciudad, provincia,
   telefono, whatsapp, email, facebook, instagram, horario_atencion, moneda)
VALUES
  -- Datos iniciales de JAGN Solution.
  --
  -- Teléfono y WhatsApp llevan EL MISMO número: hoy el negocio atiende por una
  -- sola línea. Se guardan en formato local ('998 268 132') porque es como se
  -- muestra en pantalla; el prefijo +51 lo agrega el frontend al construir los
  -- enlaces `tel:` y `wa.me` (ver linkWhatsApp/linkTelefono).
  --
  -- Las redes apuntan a las PÁGINAS PRINCIPALES de cada plataforma, no a un
  -- perfil: el negocio todavía no entregó sus cuentas oficiales y enlazar a un
  -- usuario inventado llevaría a la cuenta de otra persona.
  -- >>> REEMPLAZAR por las URLs reales cuando existan. <<<
  (1, 'JAGN Solution',
   NULL,
   'Av. Los Álamos 123', 'Lima', 'Lima',
   '998 268 132', '998 268 132',
   'contacto@jagnsolution.com',
   'https://www.facebook.com/',
   'https://www.instagram.com/',
   'Lunes a Viernes de 9 a 18 h · Sábados de 9 a 13 h',
   'PEN')
ON DUPLICATE KEY UPDATE
  nombre_empresa   = VALUES(nombre_empresa),
  logo_url         = VALUES(logo_url),
  direccion        = VALUES(direccion),
  ciudad           = VALUES(ciudad),
  provincia        = VALUES(provincia),
  telefono         = VALUES(telefono),
  whatsapp         = VALUES(whatsapp),
  email            = VALUES(email),
  facebook         = VALUES(facebook),
  instagram        = VALUES(instagram),
  horario_atencion = VALUES(horario_atencion),
  moneda           = VALUES(moneda);

-- ---------------------------------------------------------------------
--  CATEGORÍAS
-- ---------------------------------------------------------------------
INSERT IGNORE INTO categorias (nombre, slug, descripcion, orden, activo) VALUES
  ('Vasos',      'vasos',      'Vasos descartables de plástico, papel y polipapel.', 1, TRUE),
  ('Platos',     'platos',     'Platos descartables de distintos tamaños y materiales.', 2, TRUE),
  ('Cubiertos',  'cubiertos',  'Tenedores, cuchillos y cucharas descartables.', 3, TRUE),
  ('Envases',    'envases',    'Envases y bandejas para comida para llevar.', 4, TRUE),
  ('Bolsas',     'bolsas',     'Bolsas de distintos tipos y capacidades.', 5, TRUE),
  ('Servilletas','servilletas','Servilletas de papel y rollos de cocina.', 6, TRUE);

-- ---------------------------------------------------------------------
--  PRODUCTOS DE EJEMPLO
--  categoria_id se resuelve por slug para no depender del orden de IDs.
-- ---------------------------------------------------------------------
INSERT IGNORE INTO productos
  (sku, nombre, slug, descripcion, categoria_id, precio, precio_costo,
   stock, stock_minimo, unidad_medida, unidades_por_paquete, destacado, activo)
VALUES
  ('VAS-PL-180',
   'Vaso plástico 180cc x100',
   'vaso-plastico-180cc-x100',
   'Vasos de plástico transparente de 180cc. Paquete de 100 unidades.',
   (SELECT id FROM categorias WHERE slug = 'vasos'),
   950.00, 620.00, 300, 50, 'paquete', 100, TRUE, TRUE),

  ('VAS-PA-240',
   'Vaso papel 240cc x50',
   'vaso-papel-240cc-x50',
   'Vasos de papel para bebidas frías y calientes de 240cc. Paquete de 50.',
   (SELECT id FROM categorias WHERE slug = 'vasos'),
   1350.00, 900.00, 180, 40, 'paquete', 50, FALSE, TRUE),

  ('PLA-PL-22',
   'Plato plástico llano 22cm x25',
   'plato-plastico-llano-22cm-x25',
   'Platos llanos de plástico rígido de 22cm. Paquete de 25 unidades.',
   (SELECT id FROM categorias WHERE slug = 'platos'),
   1100.00, 720.00, 220, 40, 'paquete', 25, TRUE, TRUE),

  ('PLA-CA-18',
   'Plato de cartón 18cm x50',
   'plato-carton-18cm-x50',
   'Platos de cartón biodegradable de 18cm. Paquete de 50 unidades.',
   (SELECT id FROM categorias WHERE slug = 'platos'),
   1600.00, 1050.00, 150, 30, 'paquete', 50, FALSE, TRUE),

  ('CUB-TE-100',
   'Tenedores plástico x100',
   'tenedores-plastico-x100',
   'Tenedores descartables de plástico resistente. Paquete de 100.',
   (SELECT id FROM categorias WHERE slug = 'cubiertos'),
   800.00, 500.00, 400, 60, 'paquete', 100, FALSE, TRUE),

  ('ENV-BA-500',
   'Bandeja plástica 500cc x50',
   'bandeja-plastica-500cc-x50',
   'Envases con tapa para comida para llevar de 500cc. Paquete de 50.',
   (SELECT id FROM categorias WHERE slug = 'envases'),
   2400.00, 1600.00, 120, 25, 'paquete', 50, TRUE, TRUE),

  ('BOL-CA-45',
   'Bolsa camiseta 45x50 x100',
   'bolsa-camiseta-45x50-x100',
   'Bolsas tipo camiseta de 45x50cm. Paquete de 100 unidades.',
   (SELECT id FROM categorias WHERE slug = 'bolsas'),
   1900.00, 1250.00, 260, 50, 'paquete', 100, FALSE, TRUE),

  ('SER-PA-100',
   'Servilletas papel 20x20 x100',
   'servilletas-papel-20x20-x100',
   'Servilletas de papel tissue de 20x20cm. Paquete de 100 unidades.',
   (SELECT id FROM categorias WHERE slug = 'servilletas'),
   650.00, 400.00, 500, 80, 'paquete', 100, TRUE, TRUE);

-- ---------------------------------------------------------------------
--  CLIENTES DE EJEMPLO
--  `pedidos.cliente_id` es NOT NULL con FK RESTRICT: sin al menos un
--  cliente cargado no se puede registrar ningún pedido. Se incluyen un
--  consumidor final (venta de mostrador) y dos clientes con datos.
--  La clave única es (tipo_documento, documento).
-- ---------------------------------------------------------------------
INSERT IGNORE INTO clientes
  (nombre, apellido, razon_social, tipo_documento, documento,
   email, telefono, direccion, ciudad, provincia, codigo_postal, activo)
VALUES
  ('Consumidor', 'Final', NULL, 'OTRO', '00000000',
   NULL, NULL, NULL, NULL, NULL, NULL, TRUE),

  ('Martín', 'Sosa', NULL, 'DNI', '30111222',
   'martin.sosa@example.com', '+54 11 4111-2222',
   'Av. Rivadavia 1234', 'Buenos Aires', 'Buenos Aires', '1406', TRUE),

  ('Lucía', 'Ferreyra', 'Rotisería La Esquina S.R.L.', 'CUIT', '30-71234567-8',
   'compras@laesquina.example', '+54 341 433-4444',
   'San Martín 890', 'Rosario', 'Santa Fe', '2000', TRUE);

-- =====================================================================
--  FIN DEL SEED
-- =====================================================================
