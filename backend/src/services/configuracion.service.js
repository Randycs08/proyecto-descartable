/**
 * Lógica de negocio de la configuración de la empresa.
 *
 * Es un singleton: la fila id=1 la crea el seed junto con el esquema, así que
 * acá no se inserta nunca. Si faltara, se avisa con un 404 explícito en lugar de
 * dejar que el UPDATE afecte 0 filas y la petición responda "guardado" sin haber
 * guardado nada.
 *
 * El borrado del logo anterior se delega en `removeUploadedFile`
 * (upload.middleware.js), igual que en categorías y productos.
 */

import * as configuracionModel from '../models/configuracion.model.js'
import { removeUploadedFile } from '../middlewares/upload.middleware.js'
import { ApiError } from '../utils/ApiError.js'

/**
 * Campos opcionales del schema (columnas NULLABLE).
 *
 * `nombre_empresa` y `moneda` quedan afuera a propósito: son NOT NULL, y los
 * validadores exigen que, si vienen, no vengan vacíos.
 */
const OPCIONALES = [
  'email', 'telefono', 'whatsapp', 'direccion', 'ciudad', 'provincia',
  'horario_atencion', 'facebook', 'instagram', 'twitter', 'tiktok',
]

/**
 * Monedas admitidas (códigos ISO 4217).
 *
 * Es una lista cerrada y no texto libre: el frontend necesita conocer la moneda
 * para elegir el símbolo y los separadores de cada importe, así que un código
 * inventado dejaría los precios sin formato en todas las pantallas. El
 * desplegable del panel ofrece exactamente estas opciones.
 */
export const MONEDAS_VALIDAS = ['PEN', 'USD', 'EUR', 'ARS', 'CLP', 'COP', 'MXN', 'BOB']

/**
 * Convierte a NULL los opcionales que llegan vacíos.
 *
 * El formulario se envía como multipart/form-data, así que un campo que el
 * usuario borró llega como cadena vacía. Guardarlo tal cual dejaría un '' en la
 * base, que no es lo mismo que "sin dato": rompe los `IS NULL` y hace que la
 * ficha muestre un renglón en blanco en vez de omitirlo.
 */
function normalizarOpcionales(data) {
  const normalizado = { ...data }

  for (const campo of OPCIONALES) {
    if (normalizado[campo] === undefined) continue
    const valor = typeof normalizado[campo] === 'string'
      ? normalizado[campo].trim()
      : normalizado[campo]
    normalizado[campo] = valor === '' || valor === null ? null : valor
  }

  return normalizado
}

/** Devuelve la configuración de la empresa o lanza 404 si no está cargada. */
export async function get() {
  const configuracion = await configuracionModel.findOne()
  if (!configuracion) {
    throw ApiError.notFound(
      'La configuración del sistema no está inicializada. ' +
      'Carga el seed de la base (database/seeds/seed.sql)'
    )
  }
  return configuracion
}

/**
 * Actualiza la configuración.
 *
 * Sobre el logo: el controlador deja la URL del archivo nuevo en `logo_url`. El
 * anterior se borra RECIÉN cuando el UPDATE ya se confirmó; si algo falla antes,
 * la fila sigue apuntando a un archivo que existe. El archivo nuevo que quedó
 * huérfano lo limpia el manejador de errores global.
 *
 * @param {object} data  Cuerpo ya validado (puede incluir `logo_url`).
 */
export async function update(data) {
  const actual = await get() // garantiza que la fila exista (404 si no)

  const payload = normalizarOpcionales(data)
  const actualizada = await configuracionModel.update(payload)

  // Logo reemplazado: el anterior ya no lo referencia nadie.
  if (payload.logo_url && payload.logo_url !== actual.logo_url) {
    await removeUploadedFile(actual.logo_url)
  }

  return actualizada
}
