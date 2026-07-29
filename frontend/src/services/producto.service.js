/**
 * CRUD de productos contra la API, con soporte de subida de imagen (FormData).
 */

import { api } from './api.js'

function toFormData(payload) {
  const fd = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return
    fd.append(key, value)
  })
  return fd
}

export const productoService = {
  /** GET /productos con filtros/paginación -> { data, meta } */
  async list(params = {}) {
    const { data } = await api.get('/productos', { params })
    return { data: data.data, meta: data.meta }
  },

  async get(id) {
    const { data } = await api.get(`/productos/${id}`)
    return data.data
  },

  async create(payload) {
    const { data } = await api.post('/productos', toFormData(payload))
    return data.data
  },

  async update(id, payload) {
    const { data } = await api.put(`/productos/${id}`, toFormData(payload))
    return data.data
  },

  async remove(id) {
    const { data } = await api.delete(`/productos/${id}`)
    return data
  },
}
