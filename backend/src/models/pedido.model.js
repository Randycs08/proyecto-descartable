/**
 * Acceso a datos de la tabla `pedidos` (cabecera de la venta).
 * Incluye JOIN con `clientes` y `usuarios` para devolver nombres legibles.
 *
 * Las líneas del pedido viven en `detallePedido.model.js`; el servicio es quien
 * orquesta ambos modelos.
 *
 * Nota sobre `executor`: las funciones de escritura aceptan opcionalmente una
 * conexión en lugar del pool. Hoy siempre se usa el pool (las transacciones
 * quedaron fuera de esta etapa), pero dejar el parámetro permite envolver
 * cabecera y detalle en una transacción más adelante sin tocar los modelos.
 */

import { pool } from '../config/db.js'

// Selección estándar con datos relacionados.
// El nombre del cliente sale de la razón social (empresas) o del nombre y
// apellido (consumidor final); CONCAT_WS ignora los NULL.
const SELECT_BASE = `
  SELECT p.id, p.numero,
         p.cliente_id,
         COALESCE(c.razon_social, CONCAT_WS(' ', c.nombre, c.apellido)) AS cliente_nombre,
         p.usuario_id,
         CONCAT_WS(' ', u.nombre, u.apellido) AS usuario_nombre,
         p.estado, p.metodo_pago, p.estado_pago,
         p.subtotal, p.descuento, p.impuestos, p.total,
         p.direccion_entrega, p.distrito, p.referencia_entrega,
         p.notas, p.fecha_pedido,
         p.created_at, p.updated_at
    FROM pedidos p
    LEFT JOIN clientes c ON c.id = p.cliente_id
    LEFT JOIN usuarios u ON u.id = p.usuario_id
`

/**
 * Lista pedidos con filtros y paginación.
 * @param {object} opts
 * @param {string} [opts.search]     Busca por número de pedido (coincidencia parcial).
 * @param {string} [opts.estado]     Filtra por estado exacto.
 * @param {number} [opts.clienteId]  Filtra por cliente.
 * @param {number} [opts.limit]
 * @param {number} [opts.offset]
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export async function findAll({ search, estado, clienteId, limit = 20, offset = 0 } = {}) {
  const where = []
  const params = []

  if (search) {
    where.push('p.numero LIKE ?')
    params.push(`%${search}%`)
  }
  if (estado) {
    where.push('p.estado = ?')
    params.push(estado)
  }
  if (clienteId) {
    where.push('p.cliente_id = ?')
    params.push(clienteId)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  // El total usa los mismos filtros (todos sobre `p`, no hacen falta los JOIN).
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM pedidos p ${whereSql}`,
    params
  )

  const [rows] = await pool.query(
    `${SELECT_BASE} ${whereSql}
      ORDER BY p.fecha_pedido DESC, p.id DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  return { rows, total: countRows[0].total }
}

// Acepta `executor` para poder leer dentro de una transacción: una lectura
// hecha con el pool viajaría por otra conexión y no vería los cambios que la
// transacción todavía no confirmó.
export async function findById(id, executor = pool) {
  const [rows] = await executor.query(`${SELECT_BASE} WHERE p.id = ? LIMIT 1`, [id])
  return rows[0] || null
}

export async function findByNumero(numero, executor = pool) {
  const [rows] = await executor.query(`${SELECT_BASE} WHERE p.numero = ? LIMIT 1`, [numero])
  return rows[0] || null
}

/**
 * Lee la cabecera BLOQUEANDO su fila hasta el final de la transacción.
 *
 * Lo usa la cancelación: entre comprobar el estado y escribirlo, otra petición
 * podría cancelar el mismo pedido. Sin este bloqueo, dos cancelaciones
 * simultáneas repondrían el stock dos veces. Solo tiene sentido dentro de una
 * transacción.
 */
export async function findByIdForUpdate(id, executor = pool) {
  const [rows] = await executor.query(
    `SELECT id, numero, estado, notas, usuario_id
       FROM pedidos
      WHERE id = ?
      FOR UPDATE`,
    [id]
  )
  return rows[0] || null
}

/**
 * Devuelve el número más alto que empieza con el prefijo dado, o null.
 * Lo usa el servicio para armar el correlativo diario (PED-AAAAMMDD-NNNN).
 */
export async function findUltimoNumero(prefix, executor = pool) {
  const [rows] = await executor.query(
    `SELECT numero FROM pedidos
      WHERE numero LIKE ?
      ORDER BY numero DESC
      LIMIT 1`,
    [`${prefix}%`]
  )
  return rows[0]?.numero || null
}

/** Inserta la cabecera del pedido y devuelve el id generado. */
export async function create(data, executor = pool) {
  const [result] = await executor.query(
    `INSERT INTO pedidos
       (numero, cliente_id, usuario_id, estado, metodo_pago, estado_pago,
        subtotal, descuento, impuestos, total,
        direccion_entrega, distrito, referencia_entrega, notas)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.numero, data.cliente_id, data.usuario_id ?? null,
      data.estado ?? 'pendiente', data.metodo_pago ?? 'efectivo',
      data.estado_pago ?? 'pendiente',
      data.subtotal, data.descuento, data.impuestos, data.total,
      data.direccion_entrega ?? null, data.distrito ?? null,
      data.referencia_entrega ?? null, data.notas ?? null,
    ]
  )
  return result.insertId
}

/**
 * Actualiza los campos provistos de la cabecera.
 * Mismo patrón que los modelos de categorías y productos: lista blanca de
 * columnas, para que nunca llegue a la consulta un campo no previsto.
 */
export async function update(id, data, executor = pool) {
  const columns = ['estado', 'notas']
  const fields = []
  const params = []

  for (const key of columns) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`)
      params.push(data[key])
    }
  }
  if (fields.length === 0) return findById(id, executor)

  params.push(id)
  await executor.query(`UPDATE pedidos SET ${fields.join(', ')} WHERE id = ?`, params)
  return findById(id, executor)
}
