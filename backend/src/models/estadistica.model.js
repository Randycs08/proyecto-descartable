/**
 * Consultas AGREGADAS para el panel. Solo lectura.
 *
 * Todas las cuentas se resuelven en SQL (COUNT/SUM/GROUP BY) y no trayendo
 * filas para contarlas en JavaScript: además de ser mucho más barato, es la
 * única forma de que el número sea correcto sin importar cuántos registros
 * haya. El Dashboard actual del frontend contaba el stock bajo sobre las
 * primeras 100 filas y por eso dejaba de ser cierto al superar ese número.
 *
 * Este modelo cruza varias tablas (pedidos, detalle, productos, clientes,
 * inventario) porque su unidad de trabajo es el tablero, no una entidad. Los
 * modelos de cada entidad quedan intactos.
 *
 * Convención de fechas: los rangos se reciben ya resueltos por el servicio como
 * [desde, hastaExclusivo), es decir el límite superior NO se incluye. Así un
 * pedido cargado a las 23:45 del último día del período entra igual.
 */

import { pool } from '../config/db.js'

// Estado que no representa una venta y queda fuera de todos los importes.
const ESTADO_EXCLUIDO = 'cancelado'

/**
 * Totales de venta del período: importe facturado y cantidad de pedidos.
 * Excluye los pedidos cancelados.
 * @returns {Promise<{ total: number, pedidos: number }>}
 */
export async function ventasEnPeriodo(desde, hastaExclusivo) {
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(total), 0) AS total,
            COUNT(*)               AS pedidos
       FROM pedidos
      WHERE estado <> ?
        AND fecha_pedido >= ?
        AND fecha_pedido <  ?`,
    [ESTADO_EXCLUIDO, desde, hastaExclusivo]
  )
  return { total: Number(rows[0].total), pedidos: Number(rows[0].pedidos) }
}

/** Cantidad de pedidos del período agrupados por estado. */
export async function pedidosPorEstado(desde, hastaExclusivo) {
  const [rows] = await pool.query(
    `SELECT estado, COUNT(*) AS cantidad
       FROM pedidos
      WHERE fecha_pedido >= ?
        AND fecha_pedido <  ?
      GROUP BY estado`,
    [desde, hastaExclusivo]
  )
  return rows
}

/** Últimos pedidos cargados, con el nombre del cliente ya resuelto. */
export async function pedidosRecientes(limite = 5) {
  const [rows] = await pool.query(
    `SELECT p.id, p.numero,
            COALESCE(c.razon_social, CONCAT_WS(' ', c.nombre, c.apellido)) AS cliente_nombre,
            p.estado, p.total, p.fecha_pedido
       FROM pedidos p
       LEFT JOIN clientes c ON c.id = p.cliente_id
      ORDER BY p.fecha_pedido DESC, p.id DESC
      LIMIT ?`,
    [limite]
  )
  return rows
}

/**
 * Fotografía del catálogo y del inventario. No depende del período: describe
 * el estado actual, no lo que pasó en un rango de fechas.
 */
export async function resumenInventario() {
  const [rows] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM categorias)                                  AS categorias,
       (SELECT COUNT(*) FROM productos)                                   AS productos,
       (SELECT COUNT(*) FROM productos WHERE activo = 1)                  AS productosActivos,
       (SELECT COUNT(*) FROM productos WHERE destacado = 1 AND activo = 1) AS destacados,
       (SELECT COUNT(*) FROM productos WHERE activo = 1 AND stock <= stock_minimo) AS stockBajo,
       (SELECT COUNT(*) FROM productos WHERE activo = 1 AND stock = 0)    AS sinStock,
       (SELECT COALESCE(SUM(stock * precio), 0) FROM productos WHERE activo = 1) AS valorVenta,
       (SELECT COALESCE(SUM(stock * COALESCE(precio_costo, 0)), 0) FROM productos WHERE activo = 1) AS valorCosto`
  )
  const r = rows[0]
  return {
    categorias: Number(r.categorias),
    productos: Number(r.productos),
    productosActivos: Number(r.productosActivos),
    destacados: Number(r.destacados),
    stockBajo: Number(r.stockBajo),
    sinStock: Number(r.sinStock),
    valorVenta: Number(r.valorVenta),
    valorCosto: Number(r.valorCosto),
  }
}

/** Productos activos que están en o por debajo de su stock mínimo. */
export async function productosStockBajo(limite = 5) {
  const [rows] = await pool.query(
    `SELECT p.id, p.sku, p.nombre, p.stock, p.stock_minimo, p.unidad_medida,
            c.nombre AS categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.activo = 1
        AND p.stock <= p.stock_minimo
      ORDER BY (p.stock - p.stock_minimo) ASC, p.nombre ASC
      LIMIT ?`,
    [limite]
  )
  return rows
}

/** Últimos movimientos de inventario registrados. */
export async function movimientosRecientes(limite = 5) {
  const [rows] = await pool.query(
    `SELECT m.id, m.producto_id, p.nombre AS producto_nombre, p.sku AS producto_sku,
            m.tipo, m.cantidad, m.stock_anterior, m.stock_nuevo,
            m.motivo, m.pedido_id, m.created_at
       FROM movimientos_inventario m
       LEFT JOIN productos p ON p.id = m.producto_id
      ORDER BY m.id DESC
      LIMIT ?`,
    [limite]
  )
  return rows
}

/** Totales de la base de clientes (activos / inactivos). */
export async function resumenClientes() {
  const [rows] = await pool.query(
    `SELECT COUNT(*)                                  AS total,
            COALESCE(SUM(activo = 1), 0)              AS activos,
            COALESCE(SUM(activo = 0), 0)              AS inactivos
       FROM clientes`
  )
  const r = rows[0]
  return {
    total: Number(r.total),
    activos: Number(r.activos),
    inactivos: Number(r.inactivos),
  }
}

/** Clientes dados de alta dentro del período. */
export async function clientesNuevos(desde, hastaExclusivo) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cantidad
       FROM clientes
      WHERE created_at >= ?
        AND created_at <  ?`,
    [desde, hastaExclusivo]
  )
  return Number(rows[0].cantidad)
}

/** Clientes que más compraron en el período (excluye pedidos cancelados). */
export async function topClientes(desde, hastaExclusivo, limite = 5) {
  const [rows] = await pool.query(
    `SELECT c.id,
            COALESCE(c.razon_social, CONCAT_WS(' ', c.nombre, c.apellido)) AS nombre,
            COUNT(p.id)                AS pedidos,
            COALESCE(SUM(p.total), 0)  AS total
       FROM pedidos p
       JOIN clientes c ON c.id = p.cliente_id
      WHERE p.estado <> ?
        AND p.fecha_pedido >= ?
        AND p.fecha_pedido <  ?
      GROUP BY c.id, nombre
      ORDER BY total DESC, pedidos DESC
      LIMIT ?`,
    [ESTADO_EXCLUIDO, desde, hastaExclusivo, limite]
  )
  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    pedidos: Number(r.pedidos),
    total: Number(r.total),
  }))
}
