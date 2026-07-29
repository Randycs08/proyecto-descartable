/**
 * Lógica de negocio de autenticación.
 *
 * El servicio NO conoce req/res: recibe datos, aplica reglas y devuelve/lanza.
 * Aquí se compara la contraseña con bcrypt y se firma el JWT.
 */

import bcrypt from 'bcryptjs'
import * as usuarioModel from '../models/usuario.model.js'
import { signToken } from '../utils/jwt.js'
import { ApiError } from '../utils/ApiError.js'

/**
 * Quita el campo sensible del objeto usuario antes de exponerlo.
 */
function sanitizeUser(usuario) {
  const { password_hash, ...safe } = usuario
  return safe
}

/**
 * Valida credenciales y devuelve { token, usuario }.
 * @param {string} email
 * @param {string} password
 */
export async function login(email, password) {
  const usuario = await usuarioModel.findByEmailWithPassword(email)

  // Mensaje genérico para no revelar si el email existe o no.
  if (!usuario) {
    throw ApiError.unauthorized('Credenciales inválidas')
  }
  if (!usuario.activo) {
    throw ApiError.forbidden('La cuenta está desactivada')
  }

  const passwordOk = await bcrypt.compare(password, usuario.password_hash)
  if (!passwordOk) {
    throw ApiError.unauthorized('Credenciales inválidas')
  }

  // Registra el acceso (no bloquea si falla).
  usuarioModel.touchUltimoAcceso(usuario.id).catch(() => {})

  // El payload lleva el id (sub) y el rol para autorización.
  const token = signToken({ sub: usuario.id, rol: usuario.rol })

  return { token, usuario: sanitizeUser(usuario) }
}

/**
 * Devuelve el perfil del usuario autenticado (ya cargado por el middleware).
 * Se centraliza aquí por si en el futuro hay que enriquecer la respuesta.
 */
export async function getProfile(userId) {
  const usuario = await usuarioModel.findById(userId)
  if (!usuario) throw ApiError.notFound('Usuario no encontrado')
  return usuario
}
