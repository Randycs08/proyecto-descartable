/**
 * Reglas de validación del módulo de pedidos (express-validator).
 *
 * A diferencia de categorías y productos, los pedidos se envían como JSON (no
 * llevan imagen), así que los números llegan ya tipados y no hace falta
 * `.toInt()/.toFloat()` en todos lados; se conservan igualmente donde el valor
 * podría venir como texto.
 *
 * Los listados de valores permitidos se importan del servicio para no repetir
 * los ENUM del schema en dos archivos.
 */

import { body, param, query } from 'express-validator'
import {
  ESTADOS_PEDIDO,
  METODOS_PAGO,
  ESTADOS_PAGO,
} from '../services/pedido.service.js'

export const idParamRule = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo'),
]

export const numeroParamRule = [
  param('numero')
    .trim()
    .notEmpty().withMessage('El número de pedido es obligatorio')
    .isLength({ max: 20 }).withMessage('El número no puede superar 20 caracteres'),
]

/** Filtros del listado. La paginación la normaliza el controlador. */
export const listPedidosRules = [
  query('estado')
    .optional({ values: 'falsy' })
    .isIn(ESTADOS_PEDIDO)
    .withMessage(`El estado debe ser uno de: ${ESTADOS_PEDIDO.join(', ')}`),
  query('clienteId')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 }).withMessage('clienteId debe ser un entero positivo'),
]

export const createPedidoRules = [
  body('cliente_id')
    .notEmpty().withMessage('El cliente es obligatorio')
    .isInt({ min: 1 }).withMessage('cliente_id debe ser un entero positivo').toInt(),

  // --- Detalle (líneas) ---
  body('detalle')
    .isArray({ min: 1 }).withMessage('El pedido debe tener al menos una línea de detalle'),
  body('detalle.*.producto_id')
    .notEmpty().withMessage('producto_id es obligatorio en cada línea')
    .isInt({ min: 1 }).withMessage('producto_id debe ser un entero positivo').toInt(),
  body('detalle.*.cantidad')
    .notEmpty().withMessage('La cantidad es obligatoria en cada línea')
    .isInt({ min: 1 }).withMessage('La cantidad debe ser un entero mayor a 0').toInt(),
  body('detalle.*.descuento')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 }).withMessage('El descuento de la línea debe ser >= 0').toFloat(),

  // --- Cabecera (opcionales) ---
  body('metodo_pago')
    .optional({ values: 'falsy' })
    .isIn(METODOS_PAGO)
    .withMessage(`El método de pago debe ser uno de: ${METODOS_PAGO.join(', ')}`),
  body('estado_pago')
    .optional({ values: 'falsy' })
    .isIn(ESTADOS_PAGO)
    .withMessage(`El estado de pago debe ser uno de: ${ESTADOS_PAGO.join(', ')}`),
  body('descuento')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 }).withMessage('El descuento debe ser un número >= 0').toFloat(),
  body('impuestos')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 }).withMessage('Los impuestos deben ser un número >= 0').toFloat(),
  body('direccion_entrega')
    .optional({ values: 'falsy' })
    .isLength({ max: 255 }).withMessage('La dirección no puede superar 255 caracteres'),
  body('distrito')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 }).withMessage('El distrito no puede superar 100 caracteres'),
  body('referencia_entrega')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 255 }).withMessage('La referencia no puede superar 255 caracteres'),
  body('notas')
    .optional({ values: 'falsy' })
    .isLength({ max: 2000 }).withMessage('Las notas no pueden superar 2000 caracteres'),
]

export const updateEstadoRules = [
  ...idParamRule,
  body('estado')
    .notEmpty().withMessage('El estado es obligatorio')
    .isIn(ESTADOS_PEDIDO)
    .withMessage(`El estado debe ser uno de: ${ESTADOS_PEDIDO.join(', ')}`),
]

export const cancelPedidoRules = [
  ...idParamRule,
  body('motivo')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 }).withMessage('El motivo no puede superar 500 caracteres'),
]
