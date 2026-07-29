/**
 * Controladores de autenticación. Traducen la petición HTTP a llamadas al
 * servicio y devuelven la respuesta JSON estándar. No contienen lógica de
 * negocio (eso vive en auth.service.js).
 */

import * as authService from '../services/auth.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/apiResponse.js'

/**
 * POST /api/auth/login
 * Recibe { email, password }, devuelve { token, usuario }.
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const { token, usuario } = await authService.login(email, password)

  return sendSuccess(res, {
    message: 'Inicio de sesión exitoso',
    data: { token, usuario },
  })
})

/**
 * POST /api/auth/logout
 * Con JWT stateless, el logout real lo hace el cliente descartando el token.
 * Este endpoint existe por consistencia de la API y para futura invalidación
 * (blacklist / refresh tokens).
 */
export const logout = asyncHandler(async (_req, res) => {
  return sendSuccess(res, { message: 'Sesión cerrada correctamente' })
})

/**
 * GET /api/auth/me
 * Devuelve el perfil del usuario autenticado (requiere token).
 */
export const me = asyncHandler(async (req, res) => {
  const usuario = await authService.getProfile(req.user.id)
  return sendSuccess(res, { message: 'Perfil obtenido', data: usuario })
})
