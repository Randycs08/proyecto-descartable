/**
 * Controladores del CRUD de productos, incluyendo la subida de imagen (Multer
 * deja el archivo en `req.file`).
 */

import * as productoService from '../services/producto.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess, buildPaginationMeta } from '../utils/apiResponse.js'
import { buildPublicUrl } from '../middlewares/upload.middleware.js'

function getPagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20))
  return { page, limit, offset: (page - 1) * limit }
}

/** GET /api/productos — listado con filtros y paginación. */
export const listProductos = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query)

  const filters = { limit, offset }
  if (req.query.search) filters.search = req.query.search
  if (req.query.categoriaId) filters.categoriaId = Number(req.query.categoriaId)
  if (req.query.activo !== undefined) filters.activo = req.query.activo === 'true'
  if (req.query.destacado !== undefined) filters.destacado = req.query.destacado === 'true'

  const { rows, total } = await productoService.list(filters)

  return sendSuccess(res, {
    message: 'Productos obtenidos',
    data: rows,
    meta: buildPaginationMeta({ total, page, limit }),
  })
})

/** GET /api/productos/:id */
export const getProducto = asyncHandler(async (req, res) => {
  const producto = await productoService.getById(req.params.id)
  return sendSuccess(res, { message: 'Producto obtenido', data: producto })
})

/** POST /api/productos — crea un producto (imagen opcional en campo `imagen`). */
export const createProducto = asyncHandler(async (req, res) => {
  const imagenUrl = req.file ? buildPublicUrl('productos', req.file) : null
  const producto = await productoService.create(req.body, imagenUrl)

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Producto creado',
    data: producto,
  })
})

/** PUT /api/productos/:id — actualiza un producto (imagen opcional). */
export const updateProducto = asyncHandler(async (req, res) => {
  const imagenUrl = req.file ? buildPublicUrl('productos', req.file) : null
  const producto = await productoService.update(req.params.id, req.body, imagenUrl)

  return sendSuccess(res, { message: 'Producto actualizado', data: producto })
})

/** DELETE /api/productos/:id */
export const deleteProducto = asyncHandler(async (req, res) => {
  await productoService.remove(req.params.id)
  return sendSuccess(res, { message: 'Producto eliminado' })
})
