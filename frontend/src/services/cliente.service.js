/**
 * CRUD de clientes contra la API. Devuelve { data, meta } en el listado y el
 * recurso en el resto.
 *
 * A diferencia de categorías y productos, acá se envía JSON y no FormData: los
 * clientes no llevan imagen. Eso tiene una ventaja concreta: los campos vacíos
 * SÍ viajan, así que borrar el contenido de un campo opcional (un teléfono, por
 * ejemplo) efectivamente lo limpia en la base. El backend convierte las cadenas
 * vacías a NULL.
 */

import { api } from './api.js'

export const clienteService = {
  /** GET /clientes con filtros/paginación -> { data, meta } */
  async list(params = {}) {
    const { data } = await api.get('/clientes', { params })
    return { data: data.data, meta: data.meta }
  },

  async get(id) {
    const { data } = await api.get(`/clientes/${id}`)
    return data.data
  },

  /**
   * GET /clientes/documento/:documento — búsqueda EXACTA.
   * Devuelve el cliente o lanza el error normalizado (404 si no existe).
   * @param {string} documento
   * @param {string} [tipo]  Tipo de documento, para consultar la clave única.
   */
  async getByDocumento(documento, tipo) {
    const { data } = await api.get(`/clientes/documento/${encodeURIComponent(documento)}`, {
      params: tipo ? { tipo } : undefined,
    })
    return data.data
  },

  async create(payload) {
    const { data } = await api.post('/clientes', payload)
    return data.data
  },

  async update(id, payload) {
    const { data } = await api.put(`/clientes/${id}`, payload)
    return data.data
  },

  /** PATCH /clientes/:id/estado — activa o desactiva (baja lógica). */
  async setActivo(id, activo) {
    const { data } = await api.patch(`/clientes/${id}/estado`, { activo })
    return data.data
  },

  async remove(id) {
    const { data } = await api.delete(`/clientes/${id}`)
    return data
  },
}
