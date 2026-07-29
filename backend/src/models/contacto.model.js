/**
 * Acceso a datos de `contacto`: los mensajes que llegan del formulario del
 * sitio.
 *
 * La tabla es un buzón, no una entidad de negocio: se escribe una vez desde el
 * sitio y después solo se lee y se marca como leída. Por eso no hay `update`
 * general ni `remove` — el schema no tiene columna de baja y borrar un mensaje
 * recibido sería perder el único registro de que alguien escribió.
 */

import { pool } from '../config/db.js'

// El mensaje completo no se trae en el listado: es un TEXT y la tabla se
// consulta de a páginas. Se recorta para la vista previa y el detalle lo pide
// `findById`.
const SELECT_LISTA = `
  SELECT id, nombre, email, telefono, asunto,
         LEFT(mensaje, 160) AS resumen,
         CHAR_LENGTH(mensaje) > 160 AS recortado,
         leido, created_at
    FROM contacto
`

/**
 * Ordenamientos permitidos. Lista blanca: el ORDER BY no admite parámetros
 * preparados, así que lo que llega por query string nunca se interpola.
 */
const ORDENES = {
  recientes: 'created_at DESC, id DESC',
  antiguos: 'created_at ASC, id ASC',
}

export const ORDENES_VALIDOS = Object.keys(ORDENES)

/**
 * Lista mensajes con filtros y paginación.
 *
 * @param {object} opts
 * @param {string}  [opts.search]  Busca en nombre, email, asunto y mensaje.
 * @param {boolean} [opts.leido]   Filtra por leídos / sin leer.
 * @param {string}  [opts.orden]   Clave de ORDENES.
 * @param {number}  [opts.limit]
 * @param {number}  [opts.offset]
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export async function findAll({ search, leido, orden, limit = 20, offset = 0 } = {}) {
  const where = []
  const params = []

  if (search) {
    where.push('(nombre LIKE ? OR email LIKE ? OR asunto LIKE ? OR mensaje LIKE ?)')
    const patron = `%${search}%`
    params.push(patron, patron, patron, patron)
  }
  if (typeof leido === 'boolean') {
    where.push('leido = ?')
    params.push(leido)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const orderSql = ORDENES[orden] ?? ORDENES.recientes

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM contacto ${whereSql}`,
    params
  )

  const [rows] = await pool.query(
    `${SELECT_LISTA} ${whereSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  return { rows, total: countRows[0].total }
}

/** Mensaje completo por id, o null. */
export async function findById(id) {
  const [rows] = await pool.query(
    `SELECT id, nombre, email, telefono, asunto, mensaje, leido, ip, created_at
       FROM contacto WHERE id = ? LIMIT 1`,
    [id]
  )
  return rows[0] || null
}

/** Cantidad de mensajes sin leer (para el aviso del panel). */
export async function contarSinLeer() {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM contacto WHERE leido = 0')
  return Number(rows[0].total)
}

/**
 * Guarda un mensaje del formulario público.
 *
 * `leido` no se recibe: lo pone el DEFAULT del schema en FALSE. La `ip` la
 * resuelve el servidor a partir de la petición, no el visitante.
 */
export async function create(data) {
  const [result] = await pool.query(
    `INSERT INTO contacto (nombre, email, telefono, asunto, mensaje, ip)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.nombre, data.email, data.telefono ?? null,
      data.asunto ?? null, data.mensaje, data.ip ?? null,
    ]
  )
  return findById(result.insertId)
}

/** Marca un mensaje como leído o como no leído. */
export async function setLeido(id, leido) {
  const [result] = await pool.query(
    'UPDATE contacto SET leido = ? WHERE id = ?',
    [leido, id]
  )
  return result.affectedRows > 0
}
