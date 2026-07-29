/**
 * Controladores de la configuración de la empresa. Como la tabla es un
 * singleton, no hay parámetros de ruta: siempre se opera sobre la misma fila.
 */

import * as configuracionService from '../services/configuracion.service.js'
import { buildPublicUrl } from '../middlewares/upload.middleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/apiResponse.js'

/** GET /api/configuracion */
export const getConfiguracion = asyncHandler(async (_req, res) => {
  const configuracion = await configuracionService.get()
  return sendSuccess(res, { message: 'Configuración obtenida', data: configuracion })
})

/** PUT /api/configuracion — actualiza los datos de la empresa. */
export const updateConfiguracion = asyncHandler(async (req, res) => {
  const data = { ...req.body }
  if (req.file) data.logo_url = buildPublicUrl('logos', req.file)

  const configuracion = await configuracionService.update(data)
  return sendSuccess(res, { message: 'Configuración actualizada', data: configuracion })
})
