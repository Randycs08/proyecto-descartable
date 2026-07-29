/**
 * Reglas de validación del CRUD de clientes (express-validator).
 *
 * Los clientes se envían como JSON (no llevan imagen), así que los valores
 * llegan ya tipados. Los límites de longitud replican los del schema para
 * rechazar con un 422 explicativo en vez de dejar que MySQL trunque o falle.
 *
 * El listado de tipos de documento se importa del servicio para no repetir el
 * ENUM del schema en dos archivos.
 */

import { body, param, query } from 'express-validator'
import { TIPOS_DOCUMENTO } from '../services/cliente.service.js'

export const idParamRule = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo'),
]

export const documentoParamRule = [
  param('documento')
    .trim()
    .notEmpty().withMessage('El documento es obligatorio')
    .isLength({ max: 30 }).withMessage('El documento no puede superar 30 caracteres'),
  query('tipo')
    .optional({ values: 'falsy' })
    .isIn(TIPOS_DOCUMENTO)
    .withMessage(`El tipo de documento debe ser uno de: ${TIPOS_DOCUMENTO.join(', ')}`),
]

/** Filtros del listado. La paginación la normaliza el controlador. */
export const listClientesRules = [
  query('tipoDocumento')
    .optional({ values: 'falsy' })
    .isIn(TIPOS_DOCUMENTO)
    .withMessage(`El tipo de documento debe ser uno de: ${TIPOS_DOCUMENTO.join(', ')}`),
]

// Campos compartidos por alta y edición. La diferencia está en `nombre`, que es
// obligatorio al crear y opcional (pero no vacío) al actualizar.
const camposComunes = [
  body('apellido')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 120 }).withMessage('El apellido no puede superar 120 caracteres'),
  body('razon_social')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 180 }).withMessage('La razón social no puede superar 180 caracteres'),
  body('tipo_documento')
    .optional({ values: 'falsy' })
    .isIn(TIPOS_DOCUMENTO)
    .withMessage(`El tipo de documento debe ser uno de: ${TIPOS_DOCUMENTO.join(', ')}`),
  body('documento')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 30 }).withMessage('El documento no puede superar 30 caracteres'),
  body('email')
    // No se usa `normalizeEmail()` a propósito: transforma la dirección (quita
    // los puntos de Gmail, por ejemplo) y este dato se guarda y se le muestra al
    // usuario tal como lo cargó. Solo se valida y se recortan los espacios.
    .optional({ values: 'falsy' })
    .trim()
    .isEmail().withMessage('El email no es válido')
    .isLength({ max: 150 }).withMessage('El email no puede superar 150 caracteres'),
  body('telefono')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 30 }).withMessage('El teléfono no puede superar 30 caracteres'),
  body('direccion')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 255 }).withMessage('La dirección no puede superar 255 caracteres'),
  body('ciudad')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 }).withMessage('La ciudad no puede superar 100 caracteres'),
  body('provincia')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 }).withMessage('La provincia no puede superar 100 caracteres'),
  body('codigo_postal')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 15 }).withMessage('El código postal no puede superar 15 caracteres'),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser booleano').toBoolean(),
]

export const createClienteRules = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 120 }).withMessage('El nombre no puede superar 120 caracteres'),
  ...camposComunes,
]

// En update todos los campos son opcionales, pero se validan si vienen.
export const updateClienteRules = [
  ...idParamRule,
  body('nombre')
    .optional()
    .trim()
    .notEmpty().withMessage('El nombre no puede estar vacío')
    .isLength({ max: 120 }).withMessage('El nombre no puede superar 120 caracteres'),
  ...camposComunes,
]

export const setEstadoRules = [
  ...idParamRule,
  body('activo')
    .exists().withMessage('El campo activo es obligatorio')
    .isBoolean().withMessage('activo debe ser booleano').toBoolean(),
]
