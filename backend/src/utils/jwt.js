/**
 * Funciones auxiliares para firmar y verificar JSON Web Tokens.
 * Encapsula la librería `jsonwebtoken` y la configuración (secreto, expiración)
 * en un solo lugar.
 */

import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

/**
 * Firma un token JWT con el payload indicado.
 * @param {object} payload  Datos a incluir (p. ej. { sub: userId, rol }).
 * @returns {string} token firmado.
 */
export function signToken(payload) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn })
}

/**
 * Verifica y decodifica un token. Lanza si es inválido o expiró.
 * @param {string} token
 * @returns {object} payload decodificado.
 */
export function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret)
}
