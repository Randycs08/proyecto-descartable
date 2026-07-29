/**
 * Controladores del CRUD de clientes. Parsean query/params/body, delegan en el
 * servicio y devuelven respuestas estándar (con paginación en el listado).
 */

import * as clienteService from '../services/cliente.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess, buildPaginationMeta } from '../utils/apiResponse.js'

/** Parsea parámetros de paginación de la query. */
function getPagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20))
  return { page, limit, offset: (page - 1) * limit }
}

/** GET /api/clientes — listado con filtros y paginación. */
export const listClientes = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query)

  const filters = { limit, offset }
  if (req.query.search) filters.search = req.query.search
  if (req.query.activo !== undefined) filters.activo = req.query.activo === 'true'
  if (req.query.tipoDocumento) filters.tipoDocumento = req.query.tipoDocumento

  const { rows, total } = await clienteService.list(filters)

  return sendSuccess(res, {
    message: 'Clientes obtenidos',
    data: rows,
    meta: buildPaginationMeta({ total, page, limit }),
  })
})

/** GET /api/clientes/:id */
export const getCliente = asyncHandler(async (req, res) => {
  const cliente = await clienteService.getById(req.params.id)
  return sendSuccess(res, { message: 'Cliente obtenido', data: cliente })
})

/** GET /api/clientes/documento/:documento — búsqueda por documento. */
export const getClientePorDocumento = asyncHandler(async (req, res) => {
  const cliente = await clienteService.getByDocumento(
    req.params.documento,
    req.query.tipo ?? null
  )
  return sendSuccess(res, { message: 'Cliente obtenido', data: cliente })
})

/** POST /api/clientes */
export const createCliente = asyncHandler(async (req, res) => {
  const cliente = await clienteService.create(req.body)

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Cliente creado',
    data: cliente,
  })
})

/** PUT /api/clientes/:id */
export const updateCliente = asyncHandler(async (req, res) => {
  const cliente = await clienteService.update(req.params.id, req.body)
  return sendSuccess(res, { message: 'Cliente actualizado', data: cliente })
})

/** PATCH /api/clientes/:id/estado — activa o desactiva (baja lógica). */
export const setEstadoCliente = asyncHandler(async (req, res) => {
  const cliente = await clienteService.setActivo(req.params.id, req.body.activo)
  return sendSuccess(res, {
    message: cliente.activo ? 'Cliente activado' : 'Cliente desactivado',
    data: cliente,
  })
})

/** DELETE /api/clientes/:id */
export const deleteCliente = asyncHandler(async (req, res) => {
  await clienteService.remove(req.params.id)
  return sendSuccess(res, { message: 'Cliente eliminado' })
})
