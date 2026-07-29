/**
 * Construcción y configuración de la aplicación Express (sin arrancar el
 * servidor, eso lo hace server.js). Aquí se registra el pipeline completo:
 *
 *   1. Seguridad y utilidades  : helmet, cors, morgan.
 *   2. Parsers                 : JSON y urlencoded.
 *   3. Archivos estáticos      : /uploads (imágenes subidas).
 *   4. Documentación           : Swagger UI en /api/docs.
 *   5. Rutas de la API         : /api/...
 *   6. Manejo de errores       : notFound + errorHandler (SIEMPRE al final).
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import swaggerUi from 'swagger-ui-express'

import { env, isProduction } from './config/env.js'
import { swaggerSpec } from './config/swagger.js'
import apiRoutes from './routes/index.js'
import { notFound, errorHandler } from './middlewares/error.middleware.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

// Confianza en el proxy. En 0 (por defecto) no cambia nada; detrás de nginx o
// de un PaaS hay que poner TRUST_PROXY=1 o el rate limit agrupa a todos los
// usuarios en el mismo contador. Ver config/env.js.
if (env.trustProxy > 0) {
  app.set('trust proxy', env.trustProxy)
}

// 1) Seguridad -----------------------------------------------------------------
// helmet añade cabeceras de seguridad. Se permite servir imágenes a otros
// orígenes (el frontend en otro puerto) con crossOriginResourcePolicy.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)

// CORS: un ÚNICO origen permitido, el del frontend configurado. Nunca '*'.
//
//   - En producción es CLIENT_URL, que es obligatoria (ver config/env.js): si
//     falta, el servidor no arranca en vez de quedar con el valor local.
//   - En desarrollo, el mismo mecanismo con el valor por defecto
//     http://localhost:5173.
//
// La URL se normaliza sin barra final en env.js: el navegador manda el origen
// sin ella y CORS compara cadenas exactas.
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
)

// Logger HTTP: formato compacto en producción, detallado en desarrollo.
app.use(morgan(isProduction ? 'combined' : 'dev'))

// 2) Parsers -------------------------------------------------------------------
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 3) Archivos estáticos --------------------------------------------------------
// Las imágenes subidas quedan accesibles en http://host/uploads/...
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// 4) Documentación Swagger -----------------------------------------------------
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'API Descartables — Documentación',
}))
// Especificación cruda en JSON (útil para clientes / Postman).
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec))

// 5) Rutas de la API -----------------------------------------------------------
app.use('/api', apiRoutes)

// 6) Manejo de errores (al final) ---------------------------------------------
app.use(notFound)
app.use(errorHandler)

export default app
