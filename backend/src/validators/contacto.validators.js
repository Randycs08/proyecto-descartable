/**
 * Reglas del módulo de contacto.
 *
 * Las del formulario público son las importantes: es un endpoint sin
 * autenticación al que cualquiera puede escribir, así que cada campo tiene tope
 * de longitud y el mensaje un mínimo, para que el buzón no se llene de envíos
 * vacíos.
 *
 * Nótese lo que NO se valida porque NO se acepta: `leido`, `ip`, `id` y
 * `created_at`. Esos campos no se leen del cuerpo (ver contacto.service.js), así
 * que mandarlos no da error: simplemente no tiene efecto.
 */

import { body, param, query } from 'express-validator'
import { ORDENES_VALIDOS } from '../models/contacto.model.js'

/** Longitudes máximas, tomadas de database/schema.sql. */
const MAX = {
  nombre: 120,
  email: 150,
  telefono: 30,
  asunto: 180,
  mensaje: 4000, // la columna es TEXT; el tope es de sensatez, no del schema
}

/** Mínimo del mensaje: por debajo de esto no hay una consulta real. */
const MIN_MENSAJE = 10

export const idParamRule = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo'),
]

export const createContactoRules = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ min: 2, max: MAX.nombre })
    .withMessage(`El nombre debe tener entre 2 y ${MAX.nombre} caracteres`),

  body('email')
    .trim()
    .notEmpty().withMessage('El correo es obligatorio')
    .isEmail().withMessage('El correo no es válido')
    .isLength({ max: MAX.email }).withMessage(`El correo no puede superar ${MAX.email} caracteres`)
    .normalizeEmail(),

  body('telefono')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: MAX.telefono })
    .withMessage(`El teléfono no puede superar ${MAX.telefono} caracteres`),

  body('asunto')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: MAX.asunto })
    .withMessage(`El asunto no puede superar ${MAX.asunto} caracteres`),

  body('mensaje')
    .trim()
    .notEmpty().withMessage('El mensaje es obligatorio')
    .isLength({ min: MIN_MENSAJE, max: MAX.mensaje })
    .withMessage(`El mensaje debe tener entre ${MIN_MENSAJE} y ${MAX.mensaje} caracteres`),
]

export const listContactosRules = [
  query('search')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 }).withMessage('La búsqueda no puede superar 100 caracteres'),
  query('leido')
    .optional({ values: 'falsy' })
    .isIn(['true', 'false']).withMessage('leido debe ser true o false'),
  query('orden')
    .optional({ values: 'falsy' })
    .isIn(ORDENES_VALIDOS)
    .withMessage(`El orden debe ser uno de: ${ORDENES_VALIDOS.join(', ')}`),
]

export const setLeidoRules = [
  ...idParamRule,
  body('leido')
    .exists().withMessage('El campo leido es obligatorio')
    .isBoolean().withMessage('leido debe ser booleano')
    .toBoolean(),
]
