/**
 * Acceso a datos de `configuracion`: los datos de la empresa.
 *
 * La tabla es un SINGLETON. Guarda una sola fila, y el schema lo garantiza con
 * `PRIMARY KEY (id)` + `CHECK (id = 1)`: no hay forma de insertar una segunda
 * configuración aunque alguien lo intente. Por eso este modelo no tiene
 * `findAll`, ni `create`, ni `remove`, y ninguna función recibe un id: la fila
 * es siempre la misma y está fijada en la constante de abajo.
 */

import { pool } from '../config/db.js'

/** Id de la única fila de configuración que admite el schema. */
const ID_SINGLETON = 1

/** Columnas que se pueden actualizar desde la API. */
const CAMPOS_EDITABLES = [
  'nombre_empresa', 'logo_url', 'email', 'telefono', 'whatsapp',
  'direccion', 'ciudad', 'provincia', 'horario_atencion',
  'facebook', 'instagram', 'twitter', 'tiktok', 'moneda',
]

/**
 * Devuelve la configuración, o null si la fila no está cargada.
 * @returns {Promise<object|null>}
 */
export async function findOne() {
  const [rows] = await pool.query(
    `SELECT id, nombre_empresa, logo_url, email, telefono, whatsapp,
            direccion, ciudad, provincia, horario_atencion,
            facebook, instagram, twitter, tiktok, moneda,
            created_at, updated_at
       FROM configuracion
      WHERE id = ?`,
    [ID_SINGLETON]
  )
  return rows[0] || null
}

/**
 * Actualiza los campos provistos de la única fila y devuelve el resultado.
 *
 * Solo viajan las columnas presentes en `data`: un campo ausente se deja como
 * está, y uno con valor `null` se guarda como NULL (así se limpia un dato
 * opcional). La lista blanca evita que un campo inesperado del cuerpo de la
 * petición llegue al UPDATE.
 *
 * @param {object} data
 * @returns {Promise<object|null>} La configuración ya actualizada.
 */
export async function update(data) {
  const fields = []
  const params = []

  for (const key of CAMPOS_EDITABLES) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`)
      params.push(data[key])
    }
  }
  if (fields.length === 0) return findOne()

  params.push(ID_SINGLETON)
  await pool.query(`UPDATE configuracion SET ${fields.join(', ')} WHERE id = ?`, params)
  return findOne()
}
