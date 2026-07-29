/**
 * Controlador del panel de estadísticas. Lee el rango de fechas de la query,
 * delega en el servicio y devuelve la respuesta estándar.
 */

import * as estadisticaService from '../services/estadistica.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/apiResponse.js'

/** GET /api/estadisticas/resumen — todas las métricas del panel en una llamada. */
export const getResumen = asyncHandler(async (req, res) => {
  const resumen = await estadisticaService.getResumen({
    desde: req.query.desde,
    hasta: req.query.hasta,
  })

  return sendSuccess(res, { message: 'Resumen obtenido', data: resumen })
})
