/**
 * Acceso a datos de la tabla `detalle_pedido` (líneas de cada pedido).
 *
 * Cada línea guarda una "foto" del producto en el momento de la venta
 * (descripción y precio unitario), de modo que cambiar el catálogo más adelante
 * no altera los pedidos ya registrados.
 *
 * Igual que en `pedido.model.js`, las escrituras aceptan un `executor` opcional
 * para poder compartir una transacción en el futuro.
 */

import { pool } from '../config/db.js'

// Se incluye el nombre actual del producto además de la descripción histórica:
// permite ver a qué producto corresponde la línea aunque se lo haya renombrado.
const SELECT_BASE = `
  SELECT d.id, d.pedido_id, d.producto_id,
         pr.sku AS producto_sku,
         pr.nombre AS producto_nombre,
         d.descripcion, d.cantidad, d.precio_unitario, d.descuento, d.subtotal,
         d.created_at
    FROM detalle_pedido d
    LEFT JOIN productos pr ON pr.id = d.producto_id
`

/** Devuelve todas las líneas de un pedido, en el orden en que se cargaron. */
export async function findByPedido(pedidoId, executor = pool) {
  const [rows] = await executor.query(
    `${SELECT_BASE} WHERE d.pedido_id = ? ORDER BY d.id ASC`,
    [pedidoId]
  )
  return rows
}

/**
 * Inserta todas las líneas de un pedido en una sola consulta.
 *
 * Se arma un INSERT múltiple con marcadores `?` generados a partir de la
 * cantidad de líneas: sigue siendo SQL parametrizado (ningún valor se
 * interpola en el texto de la consulta) y evita N viajes a la base.
 *
 * @param {number} pedidoId
 * @param {object[]} lineas  Líneas ya calculadas por el servicio.
 * @returns {Promise<number>} Cantidad de filas insertadas.
 */
export async function createMany(pedidoId, lineas, executor = pool) {
  if (!lineas.length) return 0

  const placeholders = lineas.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')
  const params = lineas.flatMap((linea) => [
    pedidoId,
    linea.producto_id,
    linea.descripcion,
    linea.cantidad,
    linea.precio_unitario,
    linea.descuento,
    linea.subtotal,
  ])

  const [result] = await executor.query(
    `INSERT INTO detalle_pedido
       (pedido_id, producto_id, descripcion, cantidad, precio_unitario, descuento, subtotal)
     VALUES ${placeholders}`,
    params
  )
  return result.affectedRows
}
