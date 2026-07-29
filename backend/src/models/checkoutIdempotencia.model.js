/**
 * Acceso a datos de `checkout_idempotencia`: la reserva que impide que un doble
 * envío del checkout genere dos pedidos.
 *
 * Es una tabla de control, no una entidad de negocio: se reserva, se completa y
 * después solo se lee. No hay `update` general ni `remove`; las filas se borran
 * solas por ON DELETE CASCADE si se elimina el pedido.
 *
 * `reservar` y `asignarPedido` DEBEN ejecutarse con la conexión de la
 * transacción del pedido. Si viajaran por el pool quedarían fuera de ella y la
 * reserva sobreviviría a un rollback, dejando la clave inutilizable.
 */

import { pool } from '../config/db.js'

/**
 * Busca la reserva de una clave.
 *
 * @param {string} clave
 * @param {object} [executor]  Conexión de la transacción; por defecto, el pool.
 * @returns {Promise<{ clave: string, pedido_id: number|null, created_at: Date }|null>}
 */
export async function findByClave(clave, executor = pool) {
  const [rows] = await executor.query(
    'SELECT clave, pedido_id, created_at FROM checkout_idempotencia WHERE clave = ? LIMIT 1',
    [clave]
  )
  return rows[0] || null
}

/**
 * Reserva la clave. Es la PRIMERA operación de la transacción del pedido: si
 * otra solicitud ya la reservó, este INSERT queda bloqueado por la PRIMARY KEY
 * hasta que esa transacción termine, y después falla con ER_DUP_ENTRY.
 *
 * `pedido_id` queda en NULL porque el pedido todavía no existe; lo completa
 * `asignarPedido` antes de confirmar.
 */
export async function reservar(clave, executor) {
  await executor.query('INSERT INTO checkout_idempotencia (clave) VALUES (?)', [clave])
}

/** Enlaza la reserva con el pedido recién creado, dentro de la misma transacción. */
export async function asignarPedido(clave, pedidoId, executor) {
  await executor.query(
    'UPDATE checkout_idempotencia SET pedido_id = ? WHERE clave = ?',
    [pedidoId, clave]
  )
}
