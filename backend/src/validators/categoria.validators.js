/**
 * Reglas de validación del CRUD de categorías.
 *
 * Como las peticiones pueden venir como multipart/form-data (con imagen), los
 * valores llegan como texto: se usan `.toInt()/.toBoolean()` para convertir.
 */

import { body, param } from 'express-validator'

export const idParamRule = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo'),
]

export const createCategoriaRules = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 120 }).withMessage('El nombre no puede superar 120 caracteres'),
  body('descripcion')
    .optional({ values: 'falsy' })
    .isLength({ max: 500 }).withMessage('La descripción no puede superar 500 caracteres'),
  body('orden')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 }).withMessage('El orden debe ser un entero >= 0').toInt(),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser booleano').toBoolean(),
]

// En update todos los campos son opcionales, pero se validan si vienen.
export const updateCategoriaRules = [
  ...idParamRule,
  body('nombre')
    .optional()
    .trim()
    .notEmpty().withMessage('El nombre no puede estar vacío')
    .isLength({ max: 120 }).withMessage('El nombre no puede superar 120 caracteres'),
  body('descripcion')
    .optional({ values: 'falsy' })
    .isLength({ max: 500 }).withMessage('La descripción no puede superar 500 caracteres'),
  body('orden')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 }).withMessage('El orden debe ser un entero >= 0').toInt(),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser booleano').toBoolean(),
]
