/**
 * Formato ESTÁNDAR de las respuestas JSON de la API.
 *
 * Todas las respuestas comparten la misma forma para que el frontend pueda
 * tratarlas de manera uniforme:
 *
 *   Éxito:
 *   { "success": true, "message": "...", "data": {...}, "meta": {...}? }
 *
 *   Error (lo emite el middleware de errores):
 *   { "success": false, "message": "...", "errors": [...] }
 */

/**
 * Envía una respuesta exitosa estandarizada.
 * @param {import('express').Response} res
 * @param {object}  [options]
 * @param {number}  [options.statusCode=200]
 * @param {string}  [options.message='OK']
 * @param {*}       [options.data=null]     Payload principal.
 * @param {object}  [options.meta]          Metadatos (p. ej. paginación).
 */
export function sendSuccess(res, { statusCode = 200, message = 'OK', data = null, meta } = {}) {
  const body = { success: true, message, data }
  if (meta !== undefined) body.meta = meta
  return res.status(statusCode).json(body)
}

/**
 * Construye el objeto `meta` de paginación de forma consistente.
 * @param {object} params
 * @param {number} params.total  Total de registros disponibles.
 * @param {number} params.page   Página actual (1-based).
 * @param {number} params.limit  Tamaño de página.
 */
export function buildPaginationMeta({ total, page, limit }) {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  }
}
