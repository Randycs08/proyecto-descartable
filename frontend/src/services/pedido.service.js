/**
 * Pedidos contra la API. Devuelve { data, meta } en el listado y el pedido
 * completo (cabecera + detalle) en el resto.
 *
 * Se envía JSON, no FormData: los pedidos no llevan imagen y el detalle es un
 * array de objetos, que multipart no sabría transportar.
 *
 * El servidor NO acepta precios ni totales del cliente: los copia del catálogo y
 * los calcula él. Lo que la pantalla muestra antes de guardar es una vista
 * previa; el pedido creado que devuelve la API es el que manda.
 */

import { api } from './api.js'

export const pedidoService = {
  /** GET /pedidos con filtros/paginación -> { data, meta }. Sin el detalle. */
  async list(params = {}) {
    const { data } = await api.get('/pedidos', { params })
    return { data: data.data, meta: data.meta }
  },

  /** GET /pedidos/:id — cabecera + detalle. */
  async get(id) {
    const { data } = await api.get(`/pedidos/${id}`)
    return data.data
  },

  /** GET /pedidos/numero/:numero — búsqueda exacta por número. */
  async getByNumero(numero) {
    const { data } = await api.get(`/pedidos/numero/${encodeURIComponent(numero)}`)
    return data.data
  },

  /** POST /pedidos — crea la cabecera y su detalle en una sola operación. */
  async create(payload) {
    const { data } = await api.post('/pedidos', payload)
    return data.data
  },

  /** PATCH /pedidos/:id/estado — avanza el pedido en su ciclo de vida. */
  async updateEstado(id, estado) {
    const { data } = await api.patch(`/pedidos/${id}/estado`, { estado })
    return data.data
  },

  /**
   * POST /pedidos/:id/cancelar — cancela y repone el stock reservado.
   * Solo Administrador y Empleado; con otro rol la API responde 403.
   */
  async cancel(id, motivo) {
    const { data } = await api.post(`/pedidos/${id}/cancelar`, motivo ? { motivo } : {})
    return data.data
  },
}
