/**
 * Bandeja de mensajes del panel. Solo lectura y marcado: los mensajes entran
 * por el formulario del sitio (`publicoService.enviarContacto`).
 *
 * No hay `remove`: la tabla `contacto` no tiene columna de baja, así que borrar
 * sería físico e irreversible.
 */

import { api } from './api.js'

export const contactoService = {
  /**
   * GET /contactos con filtros y paginación.
   * `meta` incluye `sinLeer`, el total de mensajes pendientes.
   */
  async list(params = {}) {
    const { data } = await api.get('/contactos', { params })
    return { data: data.data, meta: data.meta }
  },

  /** GET /contactos/:id — mensaje completo. Consultarlo NO lo marca como leído. */
  async get(id) {
    const { data } = await api.get(`/contactos/${id}`)
    return data.data
  },

  /** PATCH /contactos/:id/leido — marca como leído o lo devuelve a sin leer. */
  async setLeido(id, leido) {
    const { data } = await api.patch(`/contactos/${id}/leido`, { leido })
    return data.data
  },
}

/** Opciones de orden del listado (coinciden con el backend). */
export const ORDENES_CONTACTO = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'antiguos', label: 'Más antiguos' },
]
