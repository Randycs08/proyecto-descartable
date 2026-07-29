/**
 * Protección de rutas mediante JWT.
 *
 *  - `authenticate`: exige un token válido en el header
 *      `Authorization: Bearer <token>`. Si es válido, carga el usuario en
 *      `req.user`; si no, corta con 401.
 *  - `authorize(...roles)`: exige que el usuario autenticado tenga uno de los
 *      roles indicados; si no, corta con 403. Se usa DESPUÉS de `authenticate`.
 */

import { verifyToken } from '../utils/jwt.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import * as usuarioModel from '../models/usuario.model.js'

/**
 * Extrae el token del header Authorization ("Bearer xxx").
 * @returns {string|null}
 */
function getTokenFromHeader(req) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return null
  return header.slice(7).trim() || null
}

/**
 * Verifica el JWT y adjunta el usuario a `req.user`.
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = getTokenFromHeader(req)
  if (!token) {
    throw ApiError.unauthorized('Token de autenticación no proporcionado')
  }

  let payload
  try {
    payload = verifyToken(token) // { sub, rol, ... }
  } catch {
    throw ApiError.unauthorized('Token inválido o expirado')
  }

  // Se vuelve a leer el usuario de la BD para asegurar que sigue existiendo/activo.
  const usuario = await usuarioModel.findById(payload.sub)
  if (!usuario || !usuario.activo) {
    throw ApiError.unauthorized('El usuario no existe o está inactivo')
  }

  req.user = usuario
  next()
})

/**
 * Restringe el acceso a los roles indicados.
 * @param {...string} rolesPermitidos  Nombres de rol (p. ej. 'Administrador').
 */
export function authorize(...rolesPermitidos) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized())
    }
    if (rolesPermitidos.length && !rolesPermitidos.includes(req.user.rol)) {
      return next(ApiError.forbidden('No tienes permisos para realizar esta acción'))
    }
    next()
  }
}
