/**
 * Acceso a datos de la tabla `clientes`.
 * Consultas parametrizadas + soporte de filtros y paginación.
 *
 * La clave única del negocio es el PAR (tipo_documento, documento): el mismo
 * número puede existir como DNI y como CUIT sin chocar. `documento` admite
 * NULL, y MySQL no considera iguales dos NULL, así que pueden convivir varios
 * clientes sin documento (típico de la venta de mostrador).
 */

import { pool } from '../config/db.js'

const SELECT_BASE = `
  SELECT id, nombre, apellido, razon_social, tipo_documento, documento,
         email, telefono, direccion, ciudad, provincia, codigo_postal,
         activo, created_at, updated_at
    FROM clientes
`

/**
 * Lista clientes con filtros opcionales y paginación.
 * @param {object}  opts
 * @param {string}  [opts.search]  Busca por nombre, apellido, razón social o documento.
 * @param {boolean} [opts.activo]  Filtra por estado.
 * @param {string}  [opts.tipoDocumento]
 * @param {number}  [opts.limit]
 * @param {number}  [opts.offset]
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export async function findAll({ search, activo, tipoDocumento, limit = 20, offset = 0 } = {}) {
  const where = []
  const params = []

  if (search) {
    // Un único cuadro de búsqueda para la pantalla: el operador escribe un
    // nombre o un número de documento y encuentra igual.
    where.push('(nombre LIKE ? OR apellido LIKE ? OR razon_social LIKE ? OR documento LIKE ?)')
    const patron = `%${search}%`
    params.push(patron, patron, patron, patron)
  }
  if (typeof activo === 'boolean') {
    where.push('activo = ?')
    params.push(activo)
  }
  if (tipoDocumento) {
    where.push('tipo_documento = ?')
    params.push(tipoDocumento)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  // Total (para la paginación) con los mismos filtros.
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM clientes ${whereSql}`,
    params
  )

  // Página de resultados.
  const [rows] = await pool.query(
    `${SELECT_BASE} ${whereSql}
      ORDER BY nombre ASC, apellido ASC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  return { rows, total: countRows[0].total }
}

/**
 * Busca un cliente por id. Devuelve null si no existe.
 *
 * `executor` permite leer DENTRO de una transacción en curso: una fila recién
 * insertada y todavía sin confirmar solo es visible desde su propia conexión.
 * Sin este parámetro, releer con el pool devolvería null (lo usa el checkout
 * público, que crea el cliente y el pedido en la misma transacción).
 */
export async function findById(id, executor = pool) {
  const [rows] = await executor.query(`${SELECT_BASE} WHERE id = ? LIMIT 1`, [id])
  return rows[0] || null
}

/**
 * Busca por documento.
 *
 * Con `tipoDocumento` la búsqueda es sobre la clave única y devuelve como mucho
 * una fila. Sin él, alcanza con el número: puede haber más de una coincidencia
 * (mismo número como DNI y como CUIT), en cuyo caso se devuelve la más antigua.
 */
export async function findByDocumento(documento, tipoDocumento = null, executor = pool) {
  const where = ['documento = ?']
  const params = [documento]

  if (tipoDocumento) {
    where.push('tipo_documento = ?')
    params.push(tipoDocumento)
  }

  const [rows] = await executor.query(
    `${SELECT_BASE} WHERE ${where.join(' AND ')} ORDER BY id ASC LIMIT 1`,
    params
  )
  return rows[0] || null
}

/** Inserta un cliente y devuelve el registro creado. */
export async function create(data, executor = pool) {
  const [result] = await executor.query(
    `INSERT INTO clientes
       (nombre, apellido, razon_social, tipo_documento, documento,
        email, telefono, direccion, ciudad, provincia, codigo_postal, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.nombre, data.apellido ?? null, data.razon_social ?? null,
      data.tipo_documento ?? 'DNI', data.documento ?? null,
      data.email ?? null, data.telefono ?? null, data.direccion ?? null,
      data.ciudad ?? null, data.provincia ?? null, data.codigo_postal ?? null,
      data.activo ?? true,
    ]
  )
  return findById(result.insertId, executor)
}

/**
 * Actualiza los campos provistos y devuelve el registro actualizado.
 * Mismo patrón que categorías, productos y pedidos: lista blanca de columnas.
 */
export async function update(id, data) {
  const columns = [
    'nombre', 'apellido', 'razon_social', 'tipo_documento', 'documento',
    'email', 'telefono', 'direccion', 'ciudad', 'provincia', 'codigo_postal',
    'activo',
  ]
  const fields = []
  const params = []

  for (const key of columns) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`)
      params.push(data[key])
    }
  }
  if (fields.length === 0) return findById(id)

  params.push(id)
  await pool.query(`UPDATE clientes SET ${fields.join(', ')} WHERE id = ?`, params)
  return findById(id)
}

export async function remove(id) {
  const [result] = await pool.query('DELETE FROM clientes WHERE id = ?', [id])
  return result.affectedRows > 0
}

/** Cuenta los pedidos del cliente (para el borrado seguro). */
export async function countPedidos(id) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS total FROM pedidos WHERE cliente_id = ?',
    [id]
  )
  return rows[0].total
}
