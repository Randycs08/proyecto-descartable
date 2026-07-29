/**
 * Reglas de validación de las rutas de autenticación (express-validator).
 * El middleware `validate` (montado después) convierte los errores en 422.
 */

import { body } from 'express-validator'

export const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('El email es obligatorio')
    .isEmail().withMessage('El email no es válido')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
]
