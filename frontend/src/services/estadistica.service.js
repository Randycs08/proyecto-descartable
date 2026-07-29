/**
 * Métricas del panel. Una sola llamada devuelve todo el resumen del Dashboard:
 * ventas, pedidos por estado, inventario y clientes.
 *
 * El backend restringe este endpoint a Administrador y Empleado; con el rol
 * Vendedor responde 403. La pantalla lo contempla y muestra una vista reducida
 * (ver components/dashboard/DashboardVendedor.jsx).
 */

import { api } from './api.js'

export const estadisticaService = {
  /**
   * GET /estadisticas/resumen
   * @param {object} [params]
   * @param {string} [params.desde]  'AAAA-MM-DD' (primer día incluido)
   * @param {string} [params.hasta]  'AAAA-MM-DD' (último día incluido, completo)
   */
  async getResumen(params = {}) {
    const { data } = await api.get('/estadisticas/resumen', { params })
    return data.data
  },
}

/** Opciones del selector de período del Dashboard. */
export const PERIODOS = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
  { value: 'mes', label: 'Este mes' },
]

/** Fecha local como 'AAAA-MM-DD' (no se usa toISOString: desplaza por UTC). */
function aFecha(date) {
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  const dia = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mes}-${dia}`
}

/**
 * Traduce una opción del selector al rango { desde, hasta } que espera la API.
 * Ambos extremos son inclusivos: el backend cuenta el día `hasta` completo.
 */
export function rangoDelPeriodo(periodo) {
  const hoy = new Date()

  if (periodo === 'mes') {
    return { desde: aFecha(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: aFecha(hoy) }
  }

  const dias = Number(periodo) || 30
  const desde = new Date(hoy)
  desde.setDate(desde.getDate() - (dias - 1)) // `dias` incluye el día de hoy
  return { desde: aFecha(desde), hasta: aFecha(hoy) }
}
