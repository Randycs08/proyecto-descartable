/**
 * Bandeja de mensajes del panel. Solo lectura y marcado: el alta llega por el
 * sitio público (ver publico.controller.js).
 */

import * as contactoService from '../services/contacto.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess, buildPaginationMeta } from '../utils/apiResponse.js'

/** Parsea la paginación de la query. */
function getPagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20))
  return { page, limit, offset: (page - 1) * limit }
}

/** GET /api/contactos — listado con filtros y paginación. */
export const listContactos = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query)

  const filters = { limit, offset }
  if (req.query.search) filters.search = req.query.search
  if (req.query.leido === 'true') filters.leido = true
  if (req.query.leido === 'false') filters.leido = false
  if (req.query.orden) filters.orden = req.query.orden

  const [{ rows, total }, sinLeer] = await Promise.all([
    contactoService.list(filters),
    contactoService.contarSinLeer(),
  ])

  return sendSuccess(res, {
    message: 'Mensajes obtenidos',
    data: rows,
    // `sinLeer` va en meta y no en un endpoint aparte: la bandeja lo necesita
    // en cada carga y sale de la misma petición.
    meta: { ...buildPaginationMeta({ total, page, limit }), sinLeer },
  })
})

/** GET /api/contactos/:id — mensaje completo. */
export const getContacto = asyncHandler(async (req, res) => {
  const mensaje = await contactoService.getById(req.params.id)
  return sendSuccess(res, { message: 'Mensaje obtenido', data: mensaje })
})

/** PATCH /api/contactos/:id/leido — marca como leído o sin leer. */
export const setLeidoContacto = asyncHandler(async (req, res) => {
  const mensaje = await contactoService.setLeido(req.params.id, req.body.leido)
  return sendSuccess(res, {
    message: mensaje.leido ? 'Mensaje marcado como leído' : 'Mensaje marcado como no leído',
    data: mensaje,
  })
})
