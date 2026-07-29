/**
 * Middleware que recoge el resultado de las validaciones de express-validator.
 *
 * Los archivos de `validators/` definen las reglas (cadenas de validación).
 * Este middleware se coloca al final de esa cadena: si hubo errores, corta con
 * un 422 y la lista de errores en el formato estándar; si no, continúa.
 */

import { validationResult } from 'express-validator'
import { ApiError } from '../utils/ApiError.js'

export function validate(req, _res, next) {
  const result = validationResult(req)
  if (result.isEmpty()) {
    return next()
  }

  // Normaliza los errores a { campo, mensaje }.
  const errors = result.array().map((e) => ({
    campo: e.path,
    mensaje: e.msg,
  }))

  next(ApiError.unprocessable('Errores de validación', errors))
}
