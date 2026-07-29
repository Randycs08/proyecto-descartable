/**
 * Controladores del sitio público. Traducen la query string a filtros y
 * devuelven las respuestas estándar del proyecto.
 *
 * Los filtros se arman con una lista explícita de parámetros: lo que no se
 * nombra acá no llega al modelo. En particular, no existe forma de pedir
 * productos inactivos, porque `activo` no se lee de la query.
 */

import * as publicoService from '../services/publico.service.js'
import * as checkoutService from '../services/checkout.service.js'
import * as contactoService from '../services/contacto.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess, buildPaginationMeta } from '../utils/apiResponse.js'

/** Paginación del catálogo, acotada por el tope del servicio. */
function getPagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(
    publicoService.LIMITE_MAXIMO,
    Math.max(1, Number.parseInt(query.limit, 10) || publicoService.LIMITE_POR_DEFECTO)
  )
  return { page, limit, offset: (page - 1) * limit }
}

/** GET /api/public/productos — catálogo con filtros, orden y paginación. */
export const listProductos = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query)

  const filters = { limit, offset }
  if (req.query.search) filters.search = req.query.search
  if (req.query.categoriaId) filters.categoriaId = Number(req.query.categoriaId)
  if (req.query.destacado === 'true') filters.destacado = true
  if (req.query.disponible === 'true') filters.disponible = true
  if (req.query.orden) filters.orden = req.query.orden

  const { rows, total } = await publicoService.listProductos(filters)

  return sendSuccess(res, {
    message: 'Productos obtenidos',
    data: rows,
    meta: buildPaginationMeta({ total, page, limit }),
  })
})

/** GET /api/public/productos/:slug */
export const getProducto = asyncHandler(async (req, res) => {
  const producto = await publicoService.getProductoPorSlug(req.params.slug)
  return sendSuccess(res, { message: 'Producto obtenido', data: producto })
})

/** GET /api/public/categorias */
export const listCategorias = asyncHandler(async (req, res) => {
  const categorias = await publicoService.listCategorias({
    soloConProductos: req.query.conProductos === 'true',
  })
  return sendSuccess(res, { message: 'Categorías obtenidas', data: categorias })
})

/** GET /api/public/configuracion */
export const getConfiguracion = asyncHandler(async (_req, res) => {
  const configuracion = await publicoService.getConfiguracion()
  return sendSuccess(res, { message: 'Configuración obtenida', data: configuracion })
})

/**
 * POST /api/public/checkout — registra un pedido hecho desde el sitio.
 *
 * Al servicio se le pasan SOLO las cuatro claves del checkout. Cualquier otra
 * cosa que venga en el cuerpo (un `total`, un `estado`, un `usuario_id`) muere
 * acá: no se copia `req.body` entero.
 *
 * La clave de idempotencia viaja en la cabecera y no en el cuerpo: no es un dato
 * del pedido sino del envío. El validador ya la exigió.
 *
 * Un reenvío devuelve 201 o 200 según haya creado el pedido o esté repitiendo
 * uno anterior. El cuerpo es idéntico en los dos casos, así que el sitio no
 * necesita distinguirlos; la diferencia está para quien depure o consuma la API.
 */
export const crearPedido = asyncHandler(async (req, res) => {
  const { pedido, repetido } = await checkoutService.crearPedido(
    {
      cliente: req.body.cliente,
      items: req.body.items,
      metodo_pago: req.body.metodo_pago,
      notas: req.body.notas,
    },
    req.get('Idempotency-Key')
  )

  return sendSuccess(res, {
    statusCode: repetido ? 200 : 201,
    message: repetido ? 'Pedido ya registrado' : 'Pedido registrado',
    data: pedido,
  })
})

/**
 * POST /api/public/contacto — recibe un mensaje del formulario del sitio.
 *
 * Igual que el checkout: se pasan al servicio SOLO los cinco campos del
 * formulario, no `req.body` entero. Un `leido: true` o un `id` enviados por el
 * visitante mueren acá.
 *
 * La respuesta no devuelve el mensaje guardado: al visitante no le aporta nada y
 * evita confirmarle que su envío quedó registrado con tal id.
 */
export const crearContacto = asyncHandler(async (req, res) => {
  await contactoService.create(
    {
      nombre: req.body.nombre,
      email: req.body.email,
      telefono: req.body.telefono,
      asunto: req.body.asunto,
      mensaje: req.body.mensaje,
    },
    req.ip
  )

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Recibimos tu mensaje. Te vamos a responder a la brevedad.',
  })
})
