/**
 * Acceso a datos de la tabla `usuarios`.
 *
 * La capa de modelo SOLO habla con la base de datos: recibe/devuelve datos y
 * ejecuta SQL parametrizado (con `?`) para prevenir inyección. La lógica de
 * negocio vive en los servicios.
 *
 * Nota: se hace JOIN con `roles` para exponer el nombre del rol (`rol`), que es
 * lo que usa el middleware de autorización.
 */

import { pool } from '../config/db.js'

// Columnas seguras para devolver al cliente (nunca el password_hash).
const SAFE_COLUMNS = `
  u.id, u.nombre, u.apellido, u.email, u.telefono, u.activo,
  u.rol_id, r.nombre AS rol, u.ultimo_acceso, u.created_at, u.updated_at
`

/** Busca un usuario por email, incluyendo el hash (para verificar login). */
export async function findByEmailWithPassword(email) {
  const [rows] = await pool.query(
    `SELECT ${SAFE_COLUMNS}, u.password_hash
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
      WHERE u.email = ?
      LIMIT 1`,
    [email]
  )
  return rows[0] || null
}

/** Busca un usuario por id (sin el hash). */
export async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${SAFE_COLUMNS}
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
      WHERE u.id = ?
      LIMIT 1`,
    [id]
  )
  return rows[0] || null
}

/** Actualiza la marca de último acceso al hacer login. */
export async function touchUltimoAcceso(id) {
  await pool.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?', [id])
}
