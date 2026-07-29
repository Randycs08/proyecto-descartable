/**
 * Controladores del CRUD de categorías. Parsean query/params/body, delegan en
 * el servicio y devuelven respuestas estándar (con paginación en el listado).
 */

import * as categoriaService from '../services/categoria.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess, buildPaginationMeta } from '../utils/apiResponse.js'
import { buildPublicUrl } from '../middlewares/upload.middleware.js'

/** Parsea parámetros de paginación de la query. */
function getPagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20))
  return { page, limit, offset: (page - 1) * limit }
}

/** GET /api/categorias — listado con filtros y paginación. */
export const listCategorias = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query)

  const filters = { limit, offset }
  if (req.query.search) filters.search = req.query.search
  if (req.query.activo !== undefined) filters.activo = req.query.activo === 'true'

  const { rows, total } = await categoriaService.list(filters)

  return sendSuccess(res, {
    message: 'Categorías obtenidas',
    data: rows,
    meta: buildPaginationMeta({ total, page, limit }),
  })
})

/** GET /api/categorias/:id */
export const getCategoria = asyncHandler(async (req, res) => {
  const categoria = await categoriaService.getById(req.params.id)
  return sendSuccess(res, { message: 'Categoría obtenida', data: categoria })
})

/** POST /api/categorias — crea una categoría (imagen opcional). */
export const createCategoria = asyncHandler(async (req, res) => {
  const data = { ...req.body }
  if (req.file) data.imagen_url = buildPublicUrl('categorias', req.file)

  const categoria = await categoriaService.create(data)
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Categoría creada',
    data: categoria,
  })
})

/** PUT /api/categorias/:id — actualiza una categoría. */
export const updateCategoria = asyncHandler(async (req, res) => {
  const data = { ...req.body }
  if (req.file) data.imagen_url = buildPublicUrl('categorias', req.file)

  const categoria = await categoriaService.update(req.params.id, data)
  return sendSuccess(res, { message: 'Categoría actualizada', data: categoria })
})

/** DELETE /api/categorias/:id */
export const deleteCategoria = asyncHandler(async (req, res) => {
  await categoriaService.remove(req.params.id)
  return sendSuccess(res, { message: 'Categoría eliminada' })
})
