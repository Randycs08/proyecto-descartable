/**
 * Reglas de validación del CRUD de productos.
 * Los valores numéricos/booleanos se convierten con `.toFloat()/.toInt()/
 * .toBoolean()` porque en multipart/form-data llegan como cadenas.
 */

import { body, param } from 'express-validator'

export const idParamRule = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo'),
]

export const createProductoRules = [
  body('sku')
    .trim()
    .notEmpty().withMessage('El SKU es obligatorio')
    .isLength({ max: 50 }).withMessage('El SKU no puede superar 50 caracteres'),
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 180 }).withMessage('El nombre no puede superar 180 caracteres'),
  body('categoria_id')
    .notEmpty().withMessage('La categoría es obligatoria')
    .isInt({ min: 1 }).withMessage('categoria_id debe ser un entero positivo').toInt(),
  body('precio')
    .notEmpty().withMessage('El precio es obligatorio')
    .isFloat({ min: 0 }).withMessage('El precio debe ser un número >= 0').toFloat(),
  body('precio_costo')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 }).withMessage('El costo debe ser un número >= 0').toFloat(),
  body('stock')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 }).withMessage('El stock debe ser un entero >= 0').toInt(),
  body('stock_minimo')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 }).withMessage('El stock mínimo debe ser un entero >= 0').toInt(),
  body('marca_id')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 }).withMessage('marca_id debe ser un entero positivo').toInt(),
  body('proveedor_id')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 }).withMessage('proveedor_id debe ser un entero positivo').toInt(),
  body('unidad_medida')
    .optional({ values: 'falsy' })
    .isLength({ max: 30 }).withMessage('unidad_medida no puede superar 30 caracteres'),
  body('unidades_por_paquete')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 }).withMessage('unidades_por_paquete debe ser un entero positivo').toInt(),
  body('descripcion')
    .optional({ values: 'falsy' }),
  body('destacado')
    .optional()
    .isBoolean().withMessage('destacado debe ser booleano').toBoolean(),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser booleano').toBoolean(),
]

// En update todo es opcional pero se valida lo que venga.
export const updateProductoRules = [
  ...idParamRule,
  body('sku')
    .optional().trim()
    .notEmpty().withMessage('El SKU no puede estar vacío')
    .isLength({ max: 50 }).withMessage('El SKU no puede superar 50 caracteres'),
  body('nombre')
    .optional().trim()
    .notEmpty().withMessage('El nombre no puede estar vacío')
    .isLength({ max: 180 }).withMessage('El nombre no puede superar 180 caracteres'),
  body('categoria_id')
    .optional()
    .isInt({ min: 1 }).withMessage('categoria_id debe ser un entero positivo').toInt(),
  body('precio')
    .optional()
    .isFloat({ min: 0 }).withMessage('El precio debe ser un número >= 0').toFloat(),
  body('precio_costo')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 }).withMessage('El costo debe ser un número >= 0').toFloat(),
  body('stock')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 }).withMessage('El stock debe ser un entero >= 0').toInt(),
  body('stock_minimo')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 }).withMessage('El stock mínimo debe ser un entero >= 0').toInt(),
  body('marca_id')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 }).withMessage('marca_id debe ser un entero positivo').toInt(),
  body('proveedor_id')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 }).withMessage('proveedor_id debe ser un entero positivo').toInt(),
  body('unidad_medida')
    .optional({ values: 'falsy' })
    .isLength({ max: 30 }).withMessage('unidad_medida no puede superar 30 caracteres'),
  body('unidades_por_paquete')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 }).withMessage('unidades_por_paquete debe ser un entero positivo').toInt(),
  body('descripcion').optional({ values: 'falsy' }),
  body('destacado')
    .optional()
    .isBoolean().withMessage('destacado debe ser booleano').toBoolean(),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser booleano').toBoolean(),
]
