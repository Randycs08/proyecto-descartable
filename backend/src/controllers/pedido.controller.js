/**
 * Controladores del módulo de pedidos. Parsean query/params/body, delegan en el
 * servicio y devuelven las respuestas estándar (con paginación en el listado).
 */

import * as pedidoService from '../services/pedido.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess, buildPaginationMeta } from '../utils/apiResponse.js'

/** Parsea parámetros de paginación de la query. */
function getPagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20))
  return { page, limit, offset: (page - 1) * limit }
}

/** GET /api/pedidos — listado con filtros y paginación. */
export const listPedidos = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query)

  const filters = { limit, offset }
  if (req.query.search) filters.search = req.query.search
  if (req.query.estado) filters.estado = req.query.estado
  if (req.query.clienteId) filters.clienteId = Number(req.query.clienteId)

  const { rows, total } = await pedidoService.list(filters)

  return sendSuccess(res, {
    message: 'Pedidos obtenidos',
    data: rows,
    meta: buildPaginationMeta({ total, page, limit }),
  })
})

/** GET /api/pedidos/:id */
export const getPedido = asyncHandler(async (req, res) => {
  const pedido = await pedidoService.getById(req.params.id)
  return sendSuccess(res, { message: 'Pedido obtenido', data: pedido })
})

/** GET /api/pedidos/numero/:numero — búsqueda exacta por número. */
export const getPedidoPorNumero = asyncHandler(async (req, res) => {
  const pedido = await pedidoService.getByNumero(req.params.numero)
  return sendSuccess(res, { message: 'Pedido obtenido', data: pedido })
})

/** POST /api/pedidos — crea un pedido con su detalle. */
export const createPedido = asyncHandler(async (req, res) => {
  // El vendedor que lo carga sale de la sesión, no del cuerpo de la petición.
  const pedido = await pedidoService.create(req.body, req.user?.id ?? null)

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Pedido creado',
    data: pedido,
  })
})

/** PATCH /api/pedidos/:id/estado — avanza el pedido en su ciclo de vida. */
export const updateEstadoPedido = asyncHandler(async (req, res) => {
  const pedido = await pedidoService.updateEstado(req.params.id, req.body.estado)
  return sendSuccess(res, { message: 'Estado actualizado', data: pedido })
})

/** POST /api/pedidos/:id/cancelar */
export const cancelPedido = asyncHandler(async (req, res) => {
  const pedido = await pedidoService.cancel(req.params.id, req.body?.motivo)
  return sendSuccess(res, { message: 'Pedido cancelado', data: pedido })
})
