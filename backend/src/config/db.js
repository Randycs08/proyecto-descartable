/**
 * Conexión a MySQL mediante un POOL de conexiones (mysql2/promise).
 *
 * ¿Por qué un pool y no una conexión única?
 *   - Reutiliza conexiones abiertas en vez de crear una por request (mucho más
 *     eficiente y estable bajo concurrencia).
 *   - mysql2/promise permite usar async/await con `pool.query(...)`.
 *
 * El resto de la app importa `pool` y ejecuta consultas parametrizadas
 * (con `?`) para prevenir inyección SQL.
 *
 * La misma configuración sirve para el MySQL local y para uno administrado
 * (Railway y similares): lo único que cambia son las variables DB_*. El puerto
 * NO se asume 3306, porque los servicios administrados publican uno aleatorio.
 */

import mysql from 'mysql2/promise'
import { env } from './env.js'

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  connectionLimit: env.db.connectionLimit,
  waitForConnections: true,
  queueLimit: 0,
  // Devuelve DECIMAL como número en JS (por defecto vienen como string).
  decimalNumbers: true,
  // Cómo INTERPRETA el driver las fechas que lee. Ver la nota de abajo.
  timezone: 'Z',
})

/**
 * Fija la zona horaria de cada conexión nueva del pool.
 *
 * Hay dos zonas horarias en juego y conviene no confundirlas:
 *
 *   1. La del DRIVER (`timezone: 'Z'`, arriba): cómo convierte a Date lo que
 *      lee. Con 'Z' devuelve los DATETIME tal cual están guardados.
 *   2. La de la SESIÓN de MySQL (esto): en qué zona resuelve el servidor
 *      CURRENT_TIMESTAMP y cómo convierte las columnas TIMESTAMP.
 *
 * La segunda es la que cambia al desplegar. En la máquina de desarrollo el
 * servidor MySQL ya está en la hora de Perú, así que fijarla no altera nada; en
 * un MySQL administrado el servidor corre en UTC y, sin esto, `fecha_pedido` de
 * un pedido hecho a las 19:30 de Lima se guardaría como las 00:30 del día
 * SIGUIENTE, y el pedido aparecería en el día equivocado del dashboard.
 *
 * Perú no tiene horario de verano, así que un desfase fijo es correcto todo el
 * año. Se hace en el evento `connection` porque el pool abre conexiones a
 * demanda; mysql2 encola las consultas por conexión, de modo que este SET corre
 * antes que cualquier consulta que la use.
 */
pool.on('connection', (connection) => {
  connection.query('SET time_zone = ?', [env.db.timeZone], (error) => {
    if (error) {
      console.error(
        `[DB] No se pudo fijar la zona horaria de la sesión (${env.db.timeZone}):`,
        error.message
      )
    }
  })
})

/**
 * Extrae un motivo legible del error de conexión.
 *
 * Cuando el host resuelve a varias direcciones, Node prueba todas y devuelve un
 * AggregateError con `message` VACÍO: el detalle queda en `errors[]`. Si no se
 * mira ahí, el log del despliegue termina en dos puntos y nada más.
 */
function motivoDeConexion(error) {
  if (error?.message) return error.message
  const primero = error?.errors?.[0]
  return primero?.message || error?.code || 'motivo desconocido'
}

/**
 * Verifica que la base de datos sea accesible.
 *
 * El error de mysql2 no dice a dónde intentó conectarse ni con qué usuario, que
 * es justo lo que hace falta para darse cuenta de que faltó una variable. Se
 * reescribe agregando ese contexto, sin la contraseña.
 */
export async function assertDatabaseConnection() {
  let connection
  try {
    connection = await pool.getConnection()
    await connection.ping()
  } catch (error) {
    const destino = `${env.db.user}@${env.db.host}:${env.db.port}/${env.db.database}`
    throw new Error(
      `No se pudo conectar a MySQL (${destino}): ${motivoDeConexion(error)}`,
      { cause: error }
    )
  } finally {
    connection?.release()
  }
}

/**
 * Cierra el pool liberando todas las conexiones.
 *
 * Es idempotente: al apagarse, el proceso puede recibir más de una señal
 * (SIGTERM y después SIGINT, por ejemplo) y un segundo `pool.end()` lanzaría.
 */
let cerrado = false

export async function closePool() {
  if (cerrado) return
  cerrado = true
  await pool.end()
}

/**
 * Ejecuta una función dentro de una TRANSACCIÓN.
 *
 * Toma una conexión del pool, abre la transacción y se la pasa al callback. Si
 * el callback termina bien hace COMMIT; si lanza cualquier error hace ROLLBACK
 * y vuelve a lanzar el error original (para que lo traduzca el errorHandler).
 * La conexión se devuelve al pool pase lo que pase.
 *
 * Es importante que TODAS las consultas de la operación usen la conexión que
 * recibe el callback: una consulta hecha con `pool` viaja por otra conexión y
 * quedaría FUERA de la transacción (no se revertiría en el rollback). Por eso
 * los modelos aceptan un `executor`.
 *
 * Uso:
 *   const id = await withTransaction(async (conn) => {
 *     const id = await pedidoModel.create(data, conn)
 *     await detalleModel.createMany(id, lineas, conn)
 *     return id
 *   })
 *
 * @template T
 * @param {(connection: import('mysql2/promise').PoolConnection) => Promise<T>} callback
 * @returns {Promise<T>} Lo que devuelva el callback, ya confirmado.
 */
export async function withTransaction(callback) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const resultado = await callback(connection)
    await connection.commit()
    return resultado
  } catch (error) {
    // El rollback se protege aparte: si fallara (p. ej. conexión caída), lo que
    // debe llegar al cliente es el error original, no el del rollback.
    await connection.rollback().catch(() => {})
    throw error
  } finally {
    connection.release()
  }
}
