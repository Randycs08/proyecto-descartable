/**
 * Acceso a datos de la tabla `categorias`.
 * Consultas parametrizadas + soporte de filtros y paginación.
 */

import { pool } from '../config/db.js'

/**
 * Lista categorías con filtros opcionales y paginación.
 * @param {object} opts
 * @param {string} [opts.search]  Búsqueda por nombre.
 * @param {boolean}[opts.activo]  Filtra por estado.
 * @param {number} [opts.limit]
 * @param {number} [opts.offset]
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export async function findAll({ search, activo, limit = 20, offset = 0 } = {}) {
  const where = []
  const params = []

  if (search) {
    where.push('nombre LIKE ?')
    params.push(`%${search}%`)
  }
  if (typeof activo === 'boolean') {
    where.push('activo = ?')
    params.push(activo)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  // Total (para la paginación) con los mismos filtros.
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM categorias ${whereSql}`,
    params
  )

  // Página de resultados.
  const [rows] = await pool.query(
    `SELECT id, nombre, slug, descripcion, imagen_url, orden, activo,
            created_at, updated_at
       FROM categorias
       ${whereSql}
       ORDER BY orden ASC, nombre ASC
       LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  return { rows, total: countRows[0].total }
}

export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM categorias WHERE id = ? LIMIT 1', [id])
  return rows[0] || null
}

export async function findBySlug(slug) {
  const [rows] = await pool.query('SELECT * FROM categorias WHERE slug = ? LIMIT 1', [slug])
  return rows[0] || null
}

/** Inserta una categoría y devuelve el registro creado. */
export async function create(data) {
  const [result] = await pool.query(
    `INSERT INTO categorias (nombre, slug, descripcion, imagen_url, orden, activo)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.nombre, data.slug, data.descripcion ?? null, data.imagen_url ?? null,
     data.orden ?? 0, data.activo ?? true]
  )
  return findById(result.insertId)
}

/** Actualiza una categoría con los campos provistos y devuelve el registro. */
export async function update(id, data) {
  const fields = []
  const params = []

  for (const key of ['nombre', 'slug', 'descripcion', 'imagen_url', 'orden', 'activo']) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`)
      params.push(data[key])
    }
  }
  if (fields.length === 0) return findById(id)

  params.push(id)
  await pool.query(`UPDATE categorias SET ${fields.join(', ')} WHERE id = ?`, params)
  return findById(id)
}

export async function remove(id) {
  const [result] = await pool.query('DELETE FROM categorias WHERE id = ?', [id])
  return result.affectedRows > 0
}

/** Cuenta cuántos productos referencian esta categoría (para borrado seguro). */
export async function countProductos(id) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS total FROM productos WHERE categoria_id = ?',
    [id]
  )
  return rows[0].total
}
