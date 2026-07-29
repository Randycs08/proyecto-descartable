/**
 * Carga las variables de entorno desde el archivo `.env` (mediante dotenv) y las
 * expone de forma centralizada y tipada a través de un único objeto `env`.
 *
 * Decisión de diseño: en lugar de leer `process.env.X` disperso por todo el
 * código, se concentra aquí. Así hay un solo lugar donde ver qué configuración
 * necesita la app, aplicar valores por defecto y convertir tipos (número/boolean).
 *
 * DESARROLLO vs PRODUCCIÓN
 *
 * En desarrollo casi todo tiene un valor por defecto razonable, para que el
 * proyecto arranque recién clonado con un `.env` mínimo.
 *
 * En producción esos valores por defecto son un peligro: apuntan a `localhost`,
 * al usuario `root` sin contraseña o a la base `descartables` local. Si el
 * despliegue se queda sin una variable, es mejor que el servidor NO arranque a
 * que arranque contra una base que no existe y devuelva errores 500 durante
 * horas. Por eso las variables críticas pasan a ser obligatorias cuando
 * NODE_ENV=production, y el fallo se avisa con la lista COMPLETA de lo que
 * falta, no de a una por reinicio.
 */

import 'dotenv/config'

/** Convierte una variable de entorno a número, con valor por defecto. */
const toInt = (value, fallback) => {
  const n = Number.parseInt(value, 10)
  return Number.isNaN(n) ? fallback : n
}

const nodeEnv = process.env.NODE_ENV?.trim() || 'development'
const enProduccion = nodeEnv === 'production'

/**
 * Variables sin valor por defecto seguro en producción.
 *
 * No incluye PORT: en Railway (y en cualquier PaaS) lo inyecta la plataforma, y
 * exigirlo obligaría a fijarlo a mano, que es justo lo que no hay que hacer.
 */
const OBLIGATORIAS_EN_PRODUCCION = new Set([
  'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'CLIENT_URL',
])

/** Se acumulan todas las que faltan para poder informarlas de una sola vez. */
const faltantes = []

/**
 * Lee una variable con valor por defecto. Si está en la lista de obligatorias y
 * estamos en producción, el valor por defecto no se aplica: se anota la falta.
 */
const leer = (nombre, porDefecto) => {
  const valor = process.env[nombre]?.trim()
  if (valor) return valor

  if (enProduccion && OBLIGATORIAS_EN_PRODUCCION.has(nombre)) {
    faltantes.push(nombre)
    return ''
  }
  return porDefecto
}

/** Variable obligatoria en TODOS los entornos. */
const requerida = (nombre) => {
  const valor = process.env[nombre]?.trim()
  if (!valor) {
    faltantes.push(nombre)
    return ''
  }
  return valor
}

/**
 * Quita la barra final de una URL. `https://sitio.vercel.app/` y
 * `https://sitio.vercel.app` son el mismo sitio para una persona, pero CORS
 * compara cadenas exactas y el origen que manda el navegador nunca lleva barra.
 * Es el error más fácil de cometer al pegar la URL desde Vercel.
 */
const sinBarraFinal = (url) => url.replace(/\/+$/, '')

const configuracion = {
  // --- Servidor ---
  // El puerto lo asigna la plataforma: Railway inyecta PORT y la app debe
  // escuchar ahí. El 4000 es solo para desarrollo local.
  port: toInt(process.env.PORT, 4000),
  nodeEnv,
  clientUrl: sinBarraFinal(leer('CLIENT_URL', 'http://localhost:5173')),

  // Cuántos proxies hay delante de la app (nginx, Render, Railway...).
  // En 0 —el valor por defecto— Express usa la IP de la conexión, que es lo
  // correcto con tráfico directo. Detrás de un proxy hay que ponerlo en 1 o el
  // rate limit contará a TODOS los usuarios en el mismo contador, porque req.ip
  // pasa a ser siempre la del proxy. No activarlo sin proxy real: la cabecera
  // X-Forwarded-For se falsifica y permitiría esquivar los límites.
  trustProxy: toInt(process.env.TRUST_PROXY, 0),

  // --- Base de datos ---
  db: {
    host: leer('DB_HOST', 'localhost'),
    // El puerto NO se asume 3306: los MySQL administrados (Railway entre ellos)
    // publican uno aleatorio.
    port: toInt(leer('DB_PORT', '3306'), 3306),
    user: leer('DB_USER', 'root'),
    password: leer('DB_PASSWORD', ''),
    database: leer('DB_NAME', 'descartables'),
    connectionLimit: toInt(process.env.DB_CONNECTION_LIMIT, 10),

    // Zona horaria de la SESIÓN de MySQL (ver config/db.js).
    //
    // El negocio opera en Perú, que no tiene horario de verano: el desfase es
    // -05:00 todo el año. En la máquina de desarrollo el servidor MySQL ya está
    // en esa zona, así que fijarlo no cambia nada; en un MySQL administrado el
    // servidor corre en UTC y, sin esto, un pedido de las 19:30 de Lima se
    // guardaría con fecha del día siguiente y caería en el día equivocado del
    // dashboard. Fijarlo hace que producción se comporte igual que local.
    timeZone: process.env.DB_TIMEZONE?.trim() || '-05:00',
  },

  // --- JWT ---
  jwt: {
    // Obligatoria en todos los entornos: un secreto por defecto permitiría a
    // cualquiera firmar tokens válidos.
    secret: requerida('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // --- Uploads ---
  upload: {
    maxSize: toInt(process.env.UPLOAD_MAX_SIZE, 5 * 1024 * 1024), // 5 MB
  },

  // --- Rate limiting ---
  // Protección contra fuerza bruta. Los valores viven acá (y no dentro del
  // middleware) para poder endurecer el límite en producción sin tocar código.
  // Ver `middlewares/rateLimit.middleware.js`.
  rateLimit: {
    login: {
      windowMs: toInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS, 15 * 60 * 1000), // 15 min
      max: toInt(process.env.RATE_LIMIT_LOGIN_MAX, 5), // intentos fallidos por IP
    },
    publico: {
      windowMs: toInt(process.env.RATE_LIMIT_PUBLICO_WINDOW_MS, 60 * 1000), // 1 min
      max: toInt(process.env.RATE_LIMIT_PUBLICO_MAX, 120), // peticiones por IP
    },
    checkout: {
      windowMs: toInt(process.env.RATE_LIMIT_CHECKOUT_WINDOW_MS, 60 * 60 * 1000), // 1 hora
      max: toInt(process.env.RATE_LIMIT_CHECKOUT_MAX, 10), // pedidos por IP
    },
    contacto: {
      windowMs: toInt(process.env.RATE_LIMIT_CONTACTO_WINDOW_MS, 60 * 60 * 1000), // 1 hora
      max: toInt(process.env.RATE_LIMIT_CONTACTO_MAX, 5), // mensajes por IP
    },
  },
}

// --- Validación (falla al importar, antes de que el servidor escuche) ---------

if (faltantes.length) {
  const donde = enProduccion
    ? 'Cargalas en el panel del proveedor (en Railway: servicio > pestaña Variables).'
    : 'Definilas en backend/.env (ver backend/.env.example).'

  throw new Error(
    `Faltan variables de entorno obligatorias: ${faltantes.join(', ')}. ` +
    `Con NODE_ENV=${nodeEnv} no hay un valor por defecto seguro para ellas. ${donde}`
  )
}

// El valor de ejemplo sirve para arrancar en local, no para exponer una API a
// internet: está publicado en el repositorio y cualquiera podría firmar tokens.
const SECRETO_DE_EJEMPLO = 'cambia_este_secreto_por_uno_largo_y_aleatorio'

if (enProduccion && configuracion.jwt.secret === SECRETO_DE_EJEMPLO) {
  throw new Error(
    'JWT_SECRET tiene todavía el valor de ejemplo de .env.example. ' +
    'Generá uno propio y aleatorio antes de desplegar.'
  )
}

export const env = configuracion

/** true cuando la app corre en modo producción. */
export const isProduction = enProduccion
