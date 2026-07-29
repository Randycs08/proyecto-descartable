/**
 * Mensajes del formulario de contacto.
 *
 * Sobre los estados: el schema define UNO solo, `leido BOOLEAN`. No hay
 * "respondido" ni "cerrado", así que el módulo no los inventa — un estado que
 * la base no puede guardar sería una casilla que se destilda sola al recargar.
 * Sumarlos implicaría una migración y se decide aparte.
 *
 * Los mensajes no se borran: la tabla no tiene columna de baja y perder el
 * registro de que alguien escribió no es reversible.
 */

import * as contactoModel from '../models/contacto.model.js'
import { ApiError } from '../utils/ApiError.js'

/** Cadena vacía o solo espacios -> null, para los campos opcionales. */
const limpiar = (valor) => {
  if (valor === undefined || valor === null) return null
  const texto = String(valor).trim()
  return texto === '' ? null : texto
}

/** Listado paginado con filtros. */
export async function list(filtros) {
  const { rows, total } = await contactoModel.findAll(filtros)
  // MySQL devuelve los BOOLEAN como 0/1 y la expresión `recortado` como número.
  return {
    rows: rows.map((m) => ({
      ...m,
      leido: Boolean(m.leido),
      recortado: Boolean(m.recortado),
    })),
    total,
  }
}

/** Mensaje completo o 404. */
export async function getById(id) {
  const mensaje = await contactoModel.findById(id)
  if (!mensaje) throw ApiError.notFound('Mensaje no encontrado')
  return { ...mensaje, leido: Boolean(mensaje.leido) }
}

/** Cantidad de mensajes sin leer. */
export async function contarSinLeer() {
  return contactoModel.contarSinLeer()
}

/**
 * Registra un mensaje del sitio público.
 *
 * Del visitante se toman EXACTAMENTE cinco campos. `leido`, `ip`, `id` y
 * `created_at` no se leen del cuerpo: los pone el servidor o la base. Mandarlos
 * no da error, simplemente no tiene efecto.
 *
 * @param {object} datos  Cuerpo ya validado.
 * @param {string} [ip]   IP de origen, resuelta por Express.
 */
export async function create(datos, ip = null) {
  return contactoModel.create({
    nombre: String(datos.nombre).trim(),
    email: String(datos.email).trim().toLowerCase(),
    telefono: limpiar(datos.telefono),
    asunto: limpiar(datos.asunto),
    mensaje: String(datos.mensaje).trim(),
    // Se recorta al ancho de la columna: una IPv6 con zona puede pasarse de 45.
    ip: ip ? String(ip).slice(0, 45) : null,
  })
}

/**
 * Marca un mensaje como leído o lo devuelve a sin leer.
 *
 * Es reversible a propósito: marcar sin querer no debería obligar a nadie a
 * tocar la base para deshacerlo.
 */
export async function setLeido(id, leido) {
  const mensaje = await getById(id) // 404 si no existe

  if (mensaje.leido === leido) return mensaje // idempotente

  await contactoModel.setLeido(id, leido)
  return getById(id)
}
