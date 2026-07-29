/**
 * Acceso a datos de la tabla `movimientos_inventario`.
 *
 * Es el LIBRO MAYOR del stock: cada entrada, salida o ajuste queda asentado con
 * el stock que había antes y el que quedó después. Nunca se actualiza ni se
 * borra una fila; el historial es solo de agregado (append-only), que es lo que
 * lo hace útil para auditar.
 *
 * Convención de `cantidad`: siempre POSITIVA (las unidades del movimiento). La
 * dirección la indica `tipo` ('entrada' suma, 'salida' resta), y el par
 * stock_anterior/stock_nuevo deja el efecto explícito sin ambigüedad.
 *
 * Las escrituras aceptan un `executor` para poder correr dentro de la misma
 * transacción que descuenta el stock.
 */

import { pool } from '../config/db.js'

/**
 * Inserta varios movimientos en una sola consulta.
 *
 * Igual que en `detallePedido.model.js`, los marcadores `?` se generan según la
 * cantidad de filas: sigue siendo SQL parametrizado y evita N viajes a la base.
 *
 * @param {object[]} movimientos
 * @param {import('mysql2/promise').PoolConnection|import('mysql2/promise').Pool} [executor]
 * @returns {Promise<number>} Cantidad de filas insertadas.
 */
export async function createMany(movimientos, executor = pool) {
  if (!movimientos.length) return 0

  const placeholders = movimientos.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
  const params = movimientos.flatMap((m) => [
    m.producto_id,
    m.tipo,
    m.cantidad,
    m.stock_anterior,
    m.stock_nuevo,
    m.motivo ?? null,
    m.pedido_id ?? null,
    m.usuario_id ?? null,
  ])

  const [result] = await executor.query(
    `INSERT INTO movimientos_inventario
       (producto_id, tipo, cantidad, stock_anterior, stock_nuevo,
        motivo, pedido_id, usuario_id)
     VALUES ${placeholders}`,
    params
  )
  return result.affectedRows
}
