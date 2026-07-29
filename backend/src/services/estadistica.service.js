/**
 * Lógica de negocio del panel: resolución del período, comparación contra el
 * período anterior y armado del resumen que consume el Dashboard.
 *
 * Reglas de negocio que conviene tener presentes:
 *
 *  - Los importes de venta EXCLUYEN los pedidos cancelados, pero incluyen los
 *    pendientes: con la política de stock vigente, un pedido pendiente ya
 *    reservó inventario, así que cuenta como venta comprometida. Si el negocio
 *    prefiere facturar solo lo entregado, se cambia en el modelo.
 *
 *  - Lo que describe un MOMENTO (catálogo, stock, total de clientes) no se
 *    filtra por fecha; lo que describe un FLUJO (ventas, pedidos, altas de
 *    clientes) sí. Mezclar ambas cosas es la fuente habitual de tableros que
 *    no cierran.
 */

import * as estadisticaModel from '../models/estadistica.model.js'
import { ESTADOS_PEDIDO } from './pedido.service.js'
import {
  fechaDelNegocio,
  sumarDias,
  diferenciaEnDias,
  inicioDelDia,
} from '../utils/fechas.js'

/** Días que abarca el período cuando no se indica ninguno. */
const DIAS_POR_DEFECTO = 30

/** Cantidad de filas de cada listado de apoyo. */
const LIMITE_LISTADOS = 5

/**
 * Resuelve el período pedido y el inmediatamente anterior, de igual duración.
 *
 * Se trabaja con fechas de calendario ('AAAA-MM-DD') en la zona del negocio y
 * NUNCA con instantes UTC: las columnas DATETIME guardan hora de pared, así que
 * la comparación tiene que hacerse en la misma referencia. Ver utils/fechas.js.
 *
 * Los límites son [desde, hastaExclusivo): el día `hasta` entra completo porque
 * el corte de arriba es la medianoche del día siguiente. Así un pedido de las
 * 23:45 no queda afuera.
 *
 * @param {string} [desdeTexto]  'AAAA-MM-DD'
 * @param {string} [hastaTexto]  'AAAA-MM-DD'
 */
function resolverPeriodo(desdeTexto, hastaTexto) {
  const hasta = hastaTexto || fechaDelNegocio()
  const desde = desdeTexto || sumarDias(hasta, -(DIAS_POR_DEFECTO - 1))

  const hastaExclusivo = sumarDias(hasta, 1)
  const dias = diferenciaEnDias(desde, hastaExclusivo)

  // Período anterior: misma duración, pegado justo antes del actual.
  const desdeAnterior = sumarDias(desde, -dias)

  return {
    desde,
    hasta,
    hastaExclusivo,
    dias,
    desdeAnterior,
    hastaAnteriorExclusivo: desde,
  }
}

/**
 * Variación porcentual entre dos valores.
 * Devuelve null cuando no hay base de comparación (el período anterior fue 0),
 * en vez de un 100% o un infinito que el frontend tendría que interpretar.
 */
function variacion(actual, anterior) {
  if (!anterior) return null
  return Math.round(((actual - anterior) / anterior) * 1000) / 10
}

/** Redondea importes a 2 decimales, igual que en pedidos. */
const redondear = (valor) => Math.round((Number(valor) + Number.EPSILON) * 100) / 100

/**
 * Arma el resumen completo del panel en una sola respuesta.
 *
 * Se resuelve con consultas en paralelo: son independientes entre sí y así el
 * tablero carga en el tiempo de la más lenta y no en la suma de todas.
 *
 * @param {object} [filtros]
 * @param {string} [filtros.desde]  'AAAA-MM-DD'
 * @param {string} [filtros.hasta]  'AAAA-MM-DD'
 */
export async function getResumen({ desde, hasta } = {}) {
  const periodo = resolverPeriodo(desde, hasta)

  const rangoActual = [inicioDelDia(periodo.desde), inicioDelDia(periodo.hastaExclusivo)]
  const rangoAnterior = [
    inicioDelDia(periodo.desdeAnterior),
    inicioDelDia(periodo.hastaAnteriorExclusivo),
  ]

  const [
    ventas,
    ventasAnteriores,
    porEstado,
    recientes,
    inventario,
    stockBajo,
    movimientos,
    clientes,
    nuevosClientes,
    top,
  ] = await Promise.all([
    estadisticaModel.ventasEnPeriodo(...rangoActual),
    estadisticaModel.ventasEnPeriodo(...rangoAnterior),
    estadisticaModel.pedidosPorEstado(...rangoActual),
    estadisticaModel.pedidosRecientes(LIMITE_LISTADOS),
    estadisticaModel.resumenInventario(),
    estadisticaModel.productosStockBajo(LIMITE_LISTADOS),
    estadisticaModel.movimientosRecientes(LIMITE_LISTADOS),
    estadisticaModel.resumenClientes(),
    estadisticaModel.clientesNuevos(...rangoActual),
    estadisticaModel.topClientes(...rangoActual, LIMITE_LISTADOS),
  ])

  const ticketPromedio = ventas.pedidos ? redondear(ventas.total / ventas.pedidos) : 0
  const ticketAnterior = ventasAnteriores.pedidos
    ? redondear(ventasAnteriores.total / ventasAnteriores.pedidos)
    : 0

  // Se completan con 0 los estados sin pedidos: el frontend recibe siempre las
  // mismas claves y no tiene que contemplar huecos.
  const estados = Object.fromEntries(ESTADOS_PEDIDO.map((estado) => [estado, 0]))
  for (const fila of porEstado) {
    estados[fila.estado] = Number(fila.cantidad)
  }

  return {
    periodo: {
      desde: periodo.desde,
      hasta: periodo.hasta,
      dias: periodo.dias,
    },
    ventas: {
      total: redondear(ventas.total),
      pedidos: ventas.pedidos,
      ticketPromedio,
      anterior: {
        total: redondear(ventasAnteriores.total),
        pedidos: ventasAnteriores.pedidos,
        ticketPromedio: ticketAnterior,
      },
      variacion: {
        total: variacion(ventas.total, ventasAnteriores.total),
        pedidos: variacion(ventas.pedidos, ventasAnteriores.pedidos),
        ticketPromedio: variacion(ticketPromedio, ticketAnterior),
      },
    },
    pedidos: {
      total: Object.values(estados).reduce((acumulado, n) => acumulado + n, 0),
      porEstado: estados,
      recientes,
    },
    inventario: {
      ...inventario,
      productosStockBajo: stockBajo,
      movimientosRecientes: movimientos,
    },
    clientes: {
      ...clientes,
      nuevosEnPeriodo: nuevosClientes,
      topCompradores: top,
    },
  }
}
