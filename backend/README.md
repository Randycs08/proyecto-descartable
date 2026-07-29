# Backend — API JAGN Solution

API REST profesional en **Node.js + Express + MySQL**, con autenticación **JWT**,
arquitectura **MVC en capas**, subida de imágenes con **Multer** y documentación
**Swagger/OpenAPI**.

## Módulos incluidos

- **Auth**: login, logout y perfil (`/me`), con middleware de protección por JWT y rol.
  Login protegido contra fuerza bruta (rate limit).
- **Categorías**: CRUD completo.
- **Productos**: CRUD completo con subida de imagen.
- **Clientes**: CRUD completo, búsqueda por nombre o documento, baja lógica
  (activar/desactivar) y borrado solo si nunca se los usó en un pedido.
- **Pedidos**: alta con detalle, consulta por id y por número, listado con filtros,
  máquina de estados y cancelación. Descuenta stock y registra los movimientos de
  inventario dentro de una transacción.
- **Estadísticas**: resumen del panel (ventas con comparación de períodos, pedidos
  por estado, inventario y clientes) resuelto con consultas agregadas.
- **Configuración**: datos de la empresa (identidad, contacto, redes, moneda y
  logo) sobre la fila única `id = 1`. Consulta para Administrador y Empleado;
  modificación solo para Administrador.
- **Público** (`/api/public/*`): catálogo, datos de la empresa, **checkout**
  (`POST /api/public/checkout`) y **formulario de contacto**
  (`POST /api/public/contacto`). Sin autenticación y con proyecciones recortadas.
- **Contacto**: bandeja de los mensajes recibidos, para Administrador y Empleado.
  El único estado es `leido` —el schema no define "respondido" ni "cerrado"— y no
  hay borrado: la tabla no tiene columna de baja.

### Checkout público

Del visitante se acepta **qué** quiere comprar y **a quién** facturárselo, nunca
**cuánto** cuesta: precio, subtotal, total, descuento, estado y usuario vendedor
ni siquiera se leen del cuerpo. El servidor copia los precios del catálogo, hace
las cuentas y deja el pedido en `pendiente` sin usuario del panel asociado.

El cliente se reconoce por `(tipo_documento, documento)`. Si ya existe se
reutiliza **sin pisar su ficha** —el panel manda sobre esos datos—, y si es nuevo
se crea dentro de la misma transacción que el pedido. Un cliente dado de baja no
puede comprar.

Los medios de pago del sitio (efectivo, transferencia, Yape y Plin) se guardan
como valores propios de `metodo_pago` desde la **migración 001**, y la dirección,
el distrito y la referencia van en columnas separadas del pedido. Antes Yape y
Plin caían en `otro` y la entrega se concatenaba en un solo texto, que no se
podía consultar.

### Sobre la API pública

Existe aparte de `/api/productos` y `/api/categorias` por dos motivos: aquellas
devuelven `precio_costo` y `proveedor_id` (datos internos que el panel necesita)
y dejan que el cliente decida si filtra por `activo`. En `/api/public/*` las
columnas publicables están escritas a mano en el SELECT y el filtro `activo = 1`
es fijo: no hay parámetro que permita ver productos o categorías dados de baja.

Con esa alternativa en pie, **`/api/productos` y `/api/categorias` pasaron a
exigir JWT también en sus GET**. Antes eran de lectura pública y por lo tanto
cualquiera podía consultar el costo de la mercadería o enumerar los registros
dados de baja. La regla queda simple: todo lo que no cuelga de `/api/public/*`
necesita token.

### Política de stock

El stock se descuenta **al crear el pedido**: un pedido `pendiente` ya representa
una reserva de inventario. Al cancelarlo, las unidades se reponen automáticamente.
Los cambios de estado intermedios (confirmado, en proceso, enviado, entregado) no
tocan el stock.

Cada movimiento queda asentado en `movimientos_inventario` con el stock anterior,
el nuevo y el usuario responsable: `salida` al crear el pedido, `entrada` al
cancelarlo. El alta completa (cabecera + detalle + descuento + movimientos) es una
sola transacción: si algo falla, no queda nada a medias.

## Arquitectura

```
src/
├── config/         Configuración: entorno, conexión MySQL, Swagger
│   ├── env.js
│   ├── db.js
│   └── swagger.js
├── routes/         Definición de endpoints + documentación OpenAPI
├── controllers/    Reciben req/res y arman la respuesta estándar
├── services/       Lógica de negocio (no conocen req/res)
├── models/         Acceso a datos (SQL parametrizado con mysql2/promise)
├── middlewares/    auth, validación, subida (Multer), errores
├── validators/     Reglas de express-validator
├── utils/          ApiError, respuestas, JWT, slugify, asyncHandler
├── app.js          Ensamblado de Express (middlewares + rutas + errores)
└── server.js       Arranque del servidor y cierre ordenado
```

**Flujo de una petición:**
`ruta → (auth) → (upload) → (validators) → validate → controller → service → model → MySQL`

## Puesta en marcha

```bash
cd backend
npm install
cp .env.example .env      # ajustar credenciales de MySQL y JWT_SECRET
npm run dev               # nodemon (desarrollo)
# o
npm start                 # producción
```

Requiere una base MySQL con el esquema y el seed cargados:

```bash
mysql -u root -p < ../database/schema.sql
mysql -u root -p descartables < ../database/seeds/seed.sql
```

Sobre una base **ya creada** hay que aplicar además las migraciones de
`database/migrations/`, en orden. `schema.sql` ya las incluye, así que una
instalación nueva no las necesita; son idempotentes y se pueden correr dos veces
sin error.

```bash
mysql -u root -p descartables < ../database/migrations/001_pedidos_metodos_pago_y_entrega.sql
```

## Endpoints principales

| Método | Ruta                     | Auth        | Descripción                     |
|--------|--------------------------|-------------|---------------------------------|
| POST   | `/api/auth/login`        | —           | Inicia sesión, devuelve JWT     |
| POST   | `/api/auth/logout`       | JWT         | Cierra sesión (cliente)         |
| GET    | `/api/auth/me`           | JWT         | Perfil del usuario              |
| GET    | `/api/categorias`        | JWT         | Lista categorías (paginado)     |
| GET    | `/api/categorias/:id`    | JWT         | Detalle de categoría            |
| POST   | `/api/categorias`        | Admin/Emple | Crea categoría                  |
| PUT    | `/api/categorias/:id`    | Admin/Emple | Actualiza categoría             |
| DELETE | `/api/categorias/:id`    | Admin       | Elimina categoría               |
| GET    | `/api/productos`         | JWT         | Lista productos (paginado)      |
| GET    | `/api/productos/:id`     | JWT         | Detalle de producto             |
| POST   | `/api/productos`         | Admin/Emple | Crea producto (con imagen)      |
| PUT    | `/api/productos/:id`     | Admin/Emple | Actualiza producto              |
| DELETE | `/api/productos/:id`     | Admin/Emple | Elimina producto                |
| GET    | `/api/clientes`          | Operadores  | Lista clientes (paginado)       |
| GET    | `/api/clientes/:id`      | Operadores  | Detalle de cliente              |
| GET    | `/api/clientes/documento/:doc` | Operadores | Busca por documento       |
| POST   | `/api/clientes`          | Operadores  | Crea cliente                    |
| PUT    | `/api/clientes/:id`      | Operadores  | Actualiza cliente               |
| PATCH  | `/api/clientes/:id/estado` | Operadores | Activa / desactiva             |
| DELETE | `/api/clientes/:id`      | Admin/Emple | Elimina (solo si no tiene pedidos) |
| GET    | `/api/pedidos`           | Operadores  | Lista pedidos (paginado)        |
| GET    | `/api/pedidos/:id`       | Operadores  | Detalle de pedido               |
| GET    | `/api/pedidos/numero/:n` | Operadores  | Busca por número de pedido      |
| POST   | `/api/pedidos`           | Operadores  | Crea pedido con su detalle      |
| PATCH  | `/api/pedidos/:id/estado`| Operadores  | Cambia el estado del pedido     |
| POST   | `/api/pedidos/:id/cancelar` | Admin/Emple | Cancela el pedido            |
| GET    | `/api/estadisticas/resumen` | Admin/Emple | Métricas del panel           |
| GET    | `/api/configuracion`     | Admin/Emple | Datos de la empresa             |
| PUT    | `/api/configuracion`     | Admin       | Actualiza los datos (con logo)  |
| GET    | `/api/public/productos`  | —           | Catálogo público (paginado)     |
| GET    | `/api/public/productos/:slug` | —      | Ficha pública de un producto    |
| GET    | `/api/public/categorias` | —           | Categorías activas con conteo   |
| GET    | `/api/public/configuracion` | —        | Datos de contacto de la empresa |
| POST   | `/api/public/checkout`   | —           | Registra un pedido desde el sitio |
| POST   | `/api/public/contacto`   | —           | Envía un mensaje de contacto    |
| GET    | `/api/contactos`         | Admin/Emple | Bandeja de mensajes (paginado)  |
| GET    | `/api/contactos/:id`     | Admin/Emple | Mensaje completo                |
| PATCH  | `/api/contactos/:id/leido` | Admin/Emple | Marca leído / no leído       |

> **Operadores** = Administrador, Empleado y Vendedor. Ninguna ruta de pedidos es
> pública: todas exigen JWT.

**Documentación interactiva:** `http://localhost:4000/api/docs`

## Respuestas estándar

```jsonc
// Éxito
{ "success": true, "message": "...", "data": { }, "meta": { } }

// Error
{ "success": false, "message": "...", "errors": [ { "campo": "", "mensaje": "" } ] }
```

## Autenticación

1. `POST /api/auth/login` con `{ email, password }`.
2. Usar el token devuelto en las rutas protegidas:
   `Authorization: Bearer <token>`

Credenciales de desarrollo (del seed): `admin@descartables.com` / `Admin123*`

## Subida de imágenes

Las imágenes se guardan **localmente** en `backend/uploads/{productos,categorias,logos}`
y se sirven en `/uploads/...`. La migración futura a la nube (Cloudinary/S3) solo
afecta a `middlewares/upload.middleware.js`.
