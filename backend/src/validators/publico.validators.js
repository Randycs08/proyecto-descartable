/**
 * Reglas de validación del sitio público.
 *
 * Todo lo que llega es query string o un parámetro de ruta, así que las reglas
 * son de forma: acotan longitudes y limitan `orden` a la lista blanca del
 * modelo. La seguridad de fondo (solo activos, columnas públicas) no depende de
 * estas reglas sino de las consultas.
 */

import { body, header, param, query } from 'express-validator'
import { ORDENES_VALIDOS } from '../models/publico.model.js'
import { METODOS_PAGO_PUBLICOS } from '../services/checkout.service.js'
import { TIPOS_DOCUMENTO } from '../services/cliente.service.js'

export const listProductosRules = [
  query('search')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 }).withMessage('La búsqueda no puede superar 100 caracteres'),
  query('categoriaId')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 }).withMessage('categoriaId debe ser un entero positivo'),
  query('orden')
    .optional({ values: 'falsy' })
    .isIn(ORDENES_VALIDOS)
    .withMessage(`El orden debe ser uno de: ${ORDENES_VALIDOS.join(', ')}`),
]

export const slugParamRule = [
  param('slug')
    .trim()
    .notEmpty().withMessage('El identificador del producto es obligatorio')
    .isLength({ max: 200 }).withMessage('El identificador no puede superar 200 caracteres'),
]

/**
 * Máximo de líneas distintas por pedido. No es una regla de negocio sino un
 * tope de sensatez: el carrito real no llega a eso y evita que una sola petición
 * abra cientos de bloqueos de fila dentro de la transacción.
 */
const MAX_LINEAS = 50

/** Máximo de unidades por línea, por el mismo motivo. */
const MAX_CANTIDAD = 9999

/**
 * Reglas del pedido público.
 *
 * Nótese lo que NO se valida porque NO se acepta: precio, subtotal, total,
 * descuento, impuestos, estado, estado_pago y usuario_id. Esos campos ni
 * siquiera se leen del cuerpo (ver publico.controller.js), así que mandarlos no
 * produce un error: simplemente no tiene ningún efecto.
 */
/**
 * Largo de la clave de idempotencia. El mínimo descarta claves cortas y
 * adivinables (un `1` o `abc` de otro visitante colisionaría con el pedido
 * ajeno); un UUID son 36 caracteres. El máximo es el de la columna.
 */
const LARGO_CLAVE = { min: 16, max: 64 }

export const checkoutRules = [
  // --- Clave del intento ---
  // En cabecera y no en el cuerpo: identifica el ENVÍO, no el pedido. Se lee en
  // minúscula porque Node normaliza así los nombres de cabecera.
  header('idempotency-key')
    .trim()
    .notEmpty().withMessage('Falta la cabecera Idempotency-Key')
    .isLength(LARGO_CLAVE)
    .withMessage(`La cabecera Idempotency-Key debe tener entre ${LARGO_CLAVE.min} y ${LARGO_CLAVE.max} caracteres`)
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage('La cabecera Idempotency-Key solo admite letras, números, guiones y guiones bajos'),

  // --- Comprador ---
  body('cliente').isObject().withMessage('Faltan los datos del cliente'),
  body('cliente.tipo')
    .isIn(['persona', 'empresa'])
    .withMessage('El tipo de cliente debe ser "persona" o "empresa"'),
  body('cliente.nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 120 }).withMessage('El nombre no puede superar 120 caracteres'),
  body('cliente.apellido')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 120 }).withMessage('El apellido no puede superar 120 caracteres'),
  // La razón social solo es obligatoria para empresas.
  body('cliente.razon_social')
    .if(body('cliente.tipo').equals('empresa'))
    .trim()
    .notEmpty().withMessage('La razón social es obligatoria para una empresa')
    .isLength({ max: 180 }).withMessage('La razón social no puede superar 180 caracteres'),

  body('cliente.tipo_documento')
    .isIn(TIPOS_DOCUMENTO)
    .withMessage(`El tipo de documento debe ser uno de: ${TIPOS_DOCUMENTO.join(', ')}`),
  // Obligatorio: es la clave con la que se reconoce a un cliente que vuelve.
  body('cliente.documento')
    .trim()
    .notEmpty().withMessage('El número de documento es obligatorio')
    .isLength({ min: 6, max: 30 }).withMessage('El documento debe tener entre 6 y 30 caracteres')
    .matches(/^[A-Za-z0-9.-]+$/).withMessage('El documento solo admite letras, números, puntos y guiones'),

  body('cliente.telefono')
    .trim()
    .notEmpty().withMessage('El teléfono es obligatorio para coordinar la entrega')
    .isLength({ max: 30 }).withMessage('El teléfono no puede superar 30 caracteres'),
  body('cliente.email')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail().withMessage('El correo no es válido')
    .isLength({ max: 150 }).withMessage('El correo no puede superar 150 caracteres')
    .normalizeEmail(),

  body('cliente.direccion')
    .trim()
    .notEmpty().withMessage('La dirección de entrega es obligatoria')
    .isLength({ max: 255 }).withMessage('La dirección no puede superar 255 caracteres'),
  body('cliente.distrito')
    .trim()
    .notEmpty().withMessage('El distrito es obligatorio')
    .isLength({ max: 100 }).withMessage('El distrito no puede superar 100 caracteres'),
  body('cliente.referencia')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 150 }).withMessage('La referencia no puede superar 150 caracteres'),

  // --- Pedido ---
  body('metodo_pago')
    .isIn(METODOS_PAGO_PUBLICOS)
    .withMessage(`El método de pago debe ser uno de: ${METODOS_PAGO_PUBLICOS.join(', ')}`),
  body('notas')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 }).withMessage('Las notas no pueden superar 500 caracteres'),

  // --- Carrito ---
  body('items')
    .isArray({ min: 1, max: MAX_LINEAS })
    .withMessage(`El pedido debe tener entre 1 y ${MAX_LINEAS} productos`),
  body('items.*.producto_id')
    .isInt({ min: 1 }).withMessage('Cada producto debe identificarse con un entero positivo').toInt(),
  body('items.*.cantidad')
    .isInt({ min: 1, max: MAX_CANTIDAD })
    .withMessage(`La cantidad debe ser un entero entre 1 y ${MAX_CANTIDAD}`).toInt(),
]
