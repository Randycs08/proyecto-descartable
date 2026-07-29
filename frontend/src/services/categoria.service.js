/**
 * CRUD de categorías contra la API. Devuelve { data, meta } en el listado y el
 * recurso en el resto.
 *
 * Para crear/actualizar se usa FormData porque el endpoint acepta una imagen
 * (multipart/form-data). Axios setea el Content-Type con el boundary correcto.
 */

import { api } from './api.js'

/** Construye FormData a partir de un objeto (omite null/undefined/''). */
function toFormData(payload) {
  const fd = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return
    fd.append(key, value)
  })
  return fd
}

export const categoriaService = {
  /** GET /categorias con filtros/paginación -> { data, meta } */
  async list(params = {}) {
    const { data } = await api.get('/categorias', { params })
    return { data: data.data, meta: data.meta }
  },

  async get(id) {
    const { data } = await api.get(`/categorias/${id}`)
    return data.data
  },

  async create(payload) {
    const { data } = await api.post('/categorias', toFormData(payload))
    return data.data
  },

  async update(id, payload) {
    const { data } = await api.put(`/categorias/${id}`, toFormData(payload))
    return data.data
  },

  async remove(id) {
    const { data } = await api.delete(`/categorias/${id}`)
    return data
  },
}
