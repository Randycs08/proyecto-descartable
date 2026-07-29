/**
 * Acceso a datos de la tabla `productos`.
 * Incluye JOIN con `categorias` y `marcas` para devolver nombres legibles.
 */

import { pool } from '../config/db.js'

// Selección estándar con datos relacionados.
const SELECT_BASE = `
  SELECT p.id, p.sku, p.nombre, p.slug, p.descripcion,
         p.categoria_id, c.nombre AS categoria_nombre,
         p.marca_id, m.nombre AS marca_nombre,
         p.proveedor_id,
         p.precio, p.precio_costo, p.stock, p.stock_minimo,
         p.unidad_medida, p.unidades_por_paquete,
         p.imagen_url, p.destacado, p.activo,
         p.created_at, p.updated_at
    FROM productos p
    LEFT JOIN categorias c ON c.id = p.categoria_id
    LEFT JOIN marcas m     ON m.id = p.marca_id
`

/**
 * Lista productos con filtros y paginación.
 * @param {object} opts
 * @param {string}  [opts.search]      Busca por nombre o SKU.
 * @param {number}  [opts.categoriaId] Filtra por categoría.
 * @param {boolean} [opts.activo]
 * @param {boolean} [opts.destacado]
 * @param {number}  [opts.limit]
 * @param {number}  [opts.offset]
 */
export async function findAll({
  search, categoriaId, activo, destacado, limit = 20, offset = 0,
} = {}) {
  const where = []
  const params = []

  if (search) {
    where.push('(p.nombre LIKE ? OR p.sku LIKE ?)')
    params.push(`%${search}%`, `%${search}%`)
  }
  if (categoriaId) {
    where.push('p.categoria_id = ?')
    params.push(categoriaId)
  }
  if (typeof activo === 'boolean') {
    where.push('p.activo = ?')
    params.push(activo)
  }
  if (typeof destacado === 'boolean') {
    where.push('p.destacado = ?')
    params.push(destacado)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM productos p ${whereSql}`,
    params
  )

  const [rows] = await pool.query(
    `${SELECT_BASE} ${whereSql}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  return { rows, total: countRows[0].total }
}

export async function findById(id, executor = pool) {
  const [rows] = await executor.query(`${SELECT_BASE} WHERE p.id = ? LIMIT 1`, [id])
  return rows[0] || null
}

/**
 * Lee un producto BLOQUEANDO su fila hasta el final de la transacción
 * (`SELECT ... FOR UPDATE`).
 *
 * Es la pieza que hace segura la venta concurrente: mientras esta transacción
 * no confirme, ninguna otra puede leer-para-actualizar ni modificar esa fila,
 * así que el stock que se lee acá es el mismo que se va a descontar. Sin el
 * bloqueo, dos pedidos simultáneos podrían leer "queda 1" y descontar los dos.
 *
 * Solo tiene sentido llamarla DENTRO de una transacción (`withTransaction`):
 * fuera, el bloqueo se libera de inmediato y no protege de nada.
 */
export async function findByIdForUpdate(id, executor = pool) {
  const [rows] = await executor.query(
    `SELECT id, sku, nombre, stock, activo
       FROM productos
      WHERE id = ?
      FOR UPDATE`,
    [id]
  )
  return rows[0] || null
}

/**
 * Suma `delta` al stock del producto (negativo para descontar).
 *
 * La operación es relativa (`stock = stock + ?`) y no absoluta a propósito: el
 * valor final lo calcula MySQL sobre la fila, no la aplicación, así que no se
 * puede pisar el trabajo de otra transacción. La columna tiene
 * CHECK (stock >= 0), que actúa como última red si el cálculo previo fallara.
 *
 * @returns {Promise<boolean>} true si se actualizó la fila.
 */
export async function adjustStock(id, delta, executor = pool) {
  const [result] = await executor.query(
    'UPDATE productos SET stock = stock + ? WHERE id = ?',
    [delta, id]
  )
  return result.affectedRows > 0
}

export async function findBySlug(slug) {
  const [rows] = await pool.query(`${SELECT_BASE} WHERE p.slug = ? LIMIT 1`, [slug])
  return rows[0] || null
}

export async function findBySku(sku) {
  const [rows] = await pool.query('SELECT * FROM productos WHERE sku = ? LIMIT 1', [sku])
  return rows[0] || null
}

/** Inserta un producto y devuelve el registro creado (con joins). */
export async function create(data) {
  const [result] = await pool.query(
    `INSERT INTO productos
       (sku, nombre, slug, descripcion, categoria_id, marca_id, proveedor_id,
        precio, precio_costo, stock, stock_minimo, unidad_medida,
        unidades_por_paquete, imagen_url, destacado, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.sku, data.nombre, data.slug, data.descripcion ?? null,
      data.categoria_id, data.marca_id ?? null, data.proveedor_id ?? null,
      data.precio, data.precio_costo ?? null, data.stock ?? 0, data.stock_minimo ?? 0,
      data.unidad_medida ?? 'unidad', data.unidades_por_paquete ?? null,
      data.imagen_url ?? null, data.destacado ?? false, data.activo ?? true,
    ]
  )
  return findById(result.insertId)
}

/** Actualiza los campos provistos y devuelve el registro actualizado. */
export async function update(id, data) {
  const columns = [
    'sku', 'nombre', 'slug', 'descripcion', 'categoria_id', 'marca_id',
    'proveedor_id', 'precio', 'precio_costo', 'stock', 'stock_minimo',
    'unidad_medida', 'unidades_por_paquete', 'imagen_url', 'destacado', 'activo',
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
  await pool.query(`UPDATE productos SET ${fields.join(', ')} WHERE id = ?`, params)
  return findById(id)
}

export async function remove(id) {
  const [result] = await pool.query('DELETE FROM productos WHERE id = ?', [id])
  return result.affectedRows > 0
}
