/**
 * Reglas de validación de la configuración de la empresa.
 *
 * La petición llega como multipart/form-data (lleva el logo), así que todos los
 * valores son texto y los campos que el usuario dejó en blanco llegan como
 * cadena vacía.
 *
 * De ahí el uso de `optional({ values: 'falsy' })` en los campos opcionales: una
 * cadena vacía NO se valida, se deja pasar, y el servicio la convierte a NULL.
 * Es lo que permite borrar un dato ya cargado (por ejemplo quitar el WhatsApp).
 *
 * `nombre_empresa` y `moneda` son NOT NULL en el schema: se validan con
 * `optional()` a secas, de modo que si vienen no puedan venir vacíos.
 */

import { body } from 'express-validator'
import { MONEDAS_VALIDAS } from '../services/configuracion.service.js'

/** Longitudes máximas, tomadas de database/schema.sql. */
const MAX = {
  nombre_empresa: 150,
  email: 150,
  telefono: 30,
  whatsapp: 30,
  direccion: 255,
  ciudad: 100,
  provincia: 100,
  horario_atencion: 180,
  red: 255, // facebook, instagram, twitter, tiktok
}

/** Campo de texto opcional que se puede vaciar para limpiarlo. */
const textoOpcional = (campo, maximo) =>
  body(campo)
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: maximo })
    .withMessage(`No puede superar ${maximo} caracteres`)

export const updateConfiguracionRules = [
  body('nombre_empresa')
    .optional()
    .trim()
    .notEmpty().withMessage('El nombre de la empresa no puede estar vacío')
    .isLength({ max: MAX.nombre_empresa })
    .withMessage(`El nombre no puede superar ${MAX.nombre_empresa} caracteres`),

  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail().withMessage('El email no es válido')
    .isLength({ max: MAX.email }).withMessage(`El email no puede superar ${MAX.email} caracteres`)
    .normalizeEmail(),

  textoOpcional('telefono', MAX.telefono),
  textoOpcional('whatsapp', MAX.whatsapp),
  textoOpcional('direccion', MAX.direccion),
  textoOpcional('ciudad', MAX.ciudad),
  textoOpcional('provincia', MAX.provincia),
  textoOpcional('horario_atencion', MAX.horario_atencion),

  // Se aceptan tanto una URL completa como un usuario ("@tienda"): validar que
  // sea URL dejaría fuera la forma en que suele cargarse una red social.
  textoOpcional('facebook', MAX.red),
  textoOpcional('instagram', MAX.red),
  textoOpcional('twitter', MAX.red),
  textoOpcional('tiktok', MAX.red),

  // Lista cerrada, no texto libre: un código que el frontend no conozca dejaría
  // todos los importes sin símbolo ni separadores.
  body('moneda')
    .optional()
    .trim()
    .notEmpty().withMessage('La moneda no puede estar vacía')
    .isIn(MONEDAS_VALIDAS)
    .withMessage(`La moneda debe ser una de: ${MONEDAS_VALIDAS.join(', ')}`),
]
