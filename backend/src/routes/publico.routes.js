/**
 * API del SITIO PÚBLICO. Ninguna ruta pide token: las consume un visitante que
 * todavía no es cliente.
 *
 * Por qué un prefijo `/api/public` aparte, si `GET /api/productos` y
 * `GET /api/categorias` ya respondían sin autenticación:
 *
 *   1. Aquellas devuelven `precio_costo`, `proveedor_id` y `activo`, pensadas
 *      para el panel. Publicar el costo de la mercadería a cualquiera que abra
 *      la web es un problema real, y recortarlas allí rompería el ABM.
 *   2. Aquellas dejan que el cliente elija si filtra por `activo`, así que un
 *      visitante podría listar productos dados de baja. Acá el filtro es fijo.
 *
 * Se dejan intactas: siguen siendo las que usa el panel. Queda pendiente de tu
 * decisión si conviene exigirles token, ya que hoy exponen el costo.
 *
 * Todas pasan por `publicRateLimit`: son las únicas rutas sin autenticación y
 * por lo tanto las únicas que cualquiera puede llamar en bucle.
 */

import { Router } from 'express'
import * as publicoController from '../controllers/publico.controller.js'
import {
  listProductosRules,
  slugParamRule,
  checkoutRules,
} from '../validators/publico.validators.js'
import { createContactoRules } from '../validators/contacto.validators.js'
import { validate } from '../middlewares/validate.middleware.js'
import {
  publicRateLimit,
  checkoutRateLimit,
  contactoRateLimit,
} from '../middlewares/rateLimit.middleware.js'

const router = Router()

// Se aplica a todo el módulo público, no ruta por ruta.
router.use(publicRateLimit)

/**
 * @openapi
 * /api/public/configuracion:
 *   get:
 *     tags: [Público]
 *     summary: Datos de contacto de la empresa
 *     description: >
 *       Nombre, logo, contacto, horario y redes sociales para el encabezado y el
 *       pie del sitio. No requiere autenticación y devuelve únicamente campos
 *       publicables: no incluye id ni marcas de tiempo.
 *     responses:
 *       200:
 *         description: Configuración pública
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/ConfiguracionPublica' }
 */
router.get('/configuracion', publicoController.getConfiguracion)

/**
 * @openapi
 * /api/public/categorias:
 *   get:
 *     tags: [Público]
 *     summary: Categorías publicables
 *     description: >
 *       Categorías ACTIVAS con la cantidad de productos activos de cada una.
 *       Las categorías dadas de baja no aparecen nunca.
 *     parameters:
 *       - in: query
 *         name: conProductos
 *         schema: { type: boolean }
 *         description: Si es `true`, omite las categorías sin productos publicables
 *     responses:
 *       200:
 *         description: Listado de categorías
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/CategoriaPublica' }
 */
router.get('/categorias', publicoController.listCategorias)

/**
 * @openapi
 * /api/public/productos:
 *   get:
 *     tags: [Público]
 *     summary: Catálogo público
 *     description: >
 *       Listado paginado de productos ACTIVOS que pertenecen a categorías
 *       ACTIVAS. No hay forma de pedir productos dados de baja: el filtro es
 *       fijo y no se lee de la petición.
 *
 *
 *       La respuesta NO incluye `precio_costo`, `proveedor_id`, `stock_minimo`
 *       ni marcas de tiempo.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12, maximum: 48 }
 *       - in: query
 *         name: search
 *         schema: { type: string, maxLength: 100 }
 *         description: Busca por nombre o SKU
 *       - in: query
 *         name: categoriaId
 *         schema: { type: integer }
 *       - in: query
 *         name: destacado
 *         schema: { type: boolean }
 *       - in: query
 *         name: disponible
 *         schema: { type: boolean }
 *         description: Si es `true`, solo productos con stock
 *       - in: query
 *         name: orden
 *         schema:
 *           type: string
 *           enum: [nombre, nombre_desc, precio, precio_desc, recientes]
 *           default: recientes
 *     responses:
 *       200:
 *         description: Listado paginado del catálogo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/ProductoPublico' }
 *                     meta: { $ref: '#/components/schemas/Paginacion' }
 *       422: { description: Parámetros de filtro inválidos }
 *       429: { description: Demasiadas peticiones }
 */
router.get('/productos', listProductosRules, validate, publicoController.listProductos)

/**
 * @openapi
 * /api/public/productos/{slug}:
 *   get:
 *     tags: [Público]
 *     summary: Ficha pública de un producto
 *     description: >
 *       Busca por `slug`, no por id: es lo que corresponde a una URL pública.
 *       Un producto inactivo o de una categoría inactiva responde 404, igual que
 *       uno inexistente.
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         example: vaso-plastico-180cc-x100
 *     responses:
 *       200:
 *         description: Producto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/ProductoPublico' }
 *       404:
 *         description: No encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RespuestaError' }
 */
router.get('/productos/:slug', slugParamRule, validate, publicoController.getProducto)

/**
 * @openapi
 * /api/public/checkout:
 *   post:
 *     tags: [Público]
 *     summary: Registrar un pedido desde el sitio
 *     description: >
 *       Da de alta un pedido hecho por un visitante. No requiere autenticación,
 *       pero tiene un límite estricto (10 por hora y por IP) porque escribe en
 *       la base y descuenta stock.
 *
 *
 *       **Del cuerpo solo se aceptan el comprador, los productos con su cantidad
 *       y el método de pago.** El precio, el subtotal, el total, el descuento, el
 *       estado y el usuario responsable NO se leen: los resuelve el servidor
 *       copiando los precios del catálogo en el momento de la venta. Mandarlos no
 *       da error, simplemente no tiene efecto.
 *
 *
 *       El pedido nace en estado `pendiente` y sin usuario del panel asociado.
 *       El cliente se reconoce por `(tipo_documento, documento)`: si ya existe se
 *       reutiliza sin pisar su ficha, y si no, se crea DENTRO de la misma
 *       transacción que el pedido.
 *
 *
 *       Todo es una sola transacción —cliente, cabecera, detalle, descuento de
 *       stock y movimientos de inventario—, así que si falta stock no queda nada
 *       registrado.
 *
 *
 *       `yape` y `plin` se guardan tal cual en `metodo_pago` desde la migración
 *       001. Acá no se cobra nada: la selección es informativa.
 *
 *
 *       La dirección, el distrito y la referencia se guardan en columnas
 *       separadas del pedido (`direccion_entrega`, `distrito`,
 *       `referencia_entrega`), no concatenadas en un solo texto.
 *
 *
 *       **Idempotencia.** La cabecera `Idempotency-Key` es obligatoria y debe
 *       ser distinta por intento de compra (un UUID sirve). Reenviar la misma
 *       clave NO crea un segundo pedido: devuelve el primero con `200` en lugar
 *       de `201`, con el mismo cuerpo. Dos solicitudes simultáneas con la misma
 *       clave se serializan en la base, así que el stock se descuenta una sola
 *       vez. Si el intento falla —falta de stock, datos inválidos—, la clave
 *       queda libre y se puede reintentar tal cual.
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 16
 *           maxLength: 64
 *           pattern: '^[A-Za-z0-9_-]+$'
 *         example: 3f8a1c92-5d47-4b0e-9c21-7e6b0a4d1f83
 *         description: Identificador único del intento de compra
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cliente, items, metodo_pago]
 *             properties:
 *               cliente:
 *                 type: object
 *                 required: [tipo, nombre, tipo_documento, documento, telefono, direccion, distrito]
 *                 properties:
 *                   tipo:           { type: string, enum: [persona, empresa] }
 *                   nombre:         { type: string, maxLength: 120, example: Lucía }
 *                   apellido:       { type: string, maxLength: 120, example: Ramírez }
 *                   razon_social:
 *                     type: string
 *                     maxLength: 180
 *                     description: Obligatoria si `tipo` es `empresa`
 *                   tipo_documento: { type: string, enum: [DNI, CUIT, CUIL, RUC, PASAPORTE, OTRO] }
 *                   documento:      { type: string, minLength: 6, maxLength: 30, example: '45678912' }
 *                   telefono:       { type: string, maxLength: 30, example: '+51 998 268 132' }
 *                   email:          { type: string, format: email, maxLength: 150 }
 *                   direccion:      { type: string, maxLength: 255, example: Av. Arequipa 1234 }
 *                   distrito:       { type: string, maxLength: 100, example: Miraflores }
 *                   referencia:     { type: string, maxLength: 150, example: Frente al parque }
 *               metodo_pago:
 *                 type: string
 *                 enum: [efectivo, transferencia, yape, plin]
 *               notas: { type: string, maxLength: 500 }
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 50
 *                 items:
 *                   type: object
 *                   required: [producto_id, cantidad]
 *                   properties:
 *                     producto_id: { type: integer, example: 1 }
 *                     cantidad:    { type: integer, minimum: 1, maximum: 9999, example: 2 }
 *     responses:
 *       200:
 *         description: >
 *           La clave ya se había usado: se devuelve el pedido de aquel intento
 *           sin registrar nada nuevo.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/PedidoPublico' }
 *       201:
 *         description: Pedido registrado
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/PedidoPublico' }
 *       400: { description: Producto inexistente o inactivo }
 *       409: { description: Stock insuficiente (no se registró nada) }
 *       422: { description: Errores de validación o falta `Idempotency-Key` }
 *       429: { description: Demasiados pedidos desde esta conexión }
 */
router.post('/checkout', checkoutRateLimit, checkoutRules, validate, publicoController.crearPedido)

/**
 * @openapi
 * /api/public/contacto:
 *   post:
 *     tags: [Público]
 *     summary: Enviar un mensaje de contacto
 *     description: >
 *       Recibe un mensaje del formulario del sitio. No requiere autenticación,
 *       pero tiene un límite estricto (5 por hora y por IP) porque un formulario
 *       abierto es el blanco habitual del envío automático.
 *
 *
 *       **Del cuerpo solo se aceptan cinco campos**: nombre, correo, teléfono,
 *       asunto y mensaje. El estado de lectura lo pone la base en `false`, la IP
 *       la resuelve el servidor y el id lo genera la tabla; mandarlos no da
 *       error, simplemente no tiene efecto.
 *
 *
 *       La respuesta no devuelve el mensaje guardado: al visitante no le aporta
 *       nada. Los mensajes se leen desde el panel (`GET /api/contactos`).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, email, mensaje]
 *             properties:
 *               nombre:   { type: string, minLength: 2, maxLength: 120, example: Lucía Ramírez }
 *               email:    { type: string, format: email, maxLength: 150, example: lucia@example.com }
 *               telefono: { type: string, maxLength: 30, example: '998 268 132' }
 *               asunto:   { type: string, maxLength: 180, example: Consulta por precios mayoristas }
 *               mensaje:  { type: string, minLength: 10, maxLength: 4000 }
 *     responses:
 *       201:
 *         description: Mensaje recibido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RespuestaExito' }
 *       422:
 *         description: Errores de validación
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RespuestaError' }
 *       429: { description: Demasiados mensajes desde esta conexión }
 */
router.post('/contacto', contactoRateLimit, createContactoRules, validate, publicoController.crearContacto)

export default router
