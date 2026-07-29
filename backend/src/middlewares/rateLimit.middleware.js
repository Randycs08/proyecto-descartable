/**
 * Límites de peticiones. Hay uno por endpoint en vez de uno global, para que
 * cada uno tenga el tope que le corresponde.
 *
 * El contador va por IP, no por email: contando por email cualquiera podría
 * bloquear la cuenta de otro mandando intentos fallidos con su dirección.
 *
 * AL DESPLEGAR detrás de un proxy (nginx, Render, Railway) hay que agregar
 * `app.set('trust proxy', 1)` en app.js, o todos los usuarios compartirán el
 * mismo contador. No activarlo antes: X-Forwarded-For es falsificable.
 */

import { rateLimit } from 'express-rate-limit'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

/** Duración de la ventana, ya redactada para el mensaje al usuario. */
const windowMinutes = Math.ceil(env.rateLimit.login.windowMs / 60_000)
const windowLabel = `${windowMinutes} ${windowMinutes === 1 ? 'minuto' : 'minutos'}`

/** Login: 5 intentos fallidos por IP cada 15 minutos. */
export const loginRateLimit = rateLimit({
  windowMs: env.rateLimit.login.windowMs,
  limit: env.rateLimit.login.max,

  // Un login correcto no consume intentos.
  skipSuccessfulRequests: true,

  standardHeaders: 'draft-7',
  legacyHeaders: false,

  // Se delega en el errorHandler para que el 429 salga con el formato estándar.
  handler: (_req, _res, next) => {
    next(
      ApiError.tooManyRequests(
        `Demasiados intentos de inicio de sesión. Espera ${windowLabel} e intenta de nuevo.`
      )
    )
  },
})

/**
 * Sitio público: 120 por minuto e IP. No protege un secreto (los datos son
 * públicos) sino la base, para que un raspado del catálogo no consuma las
 * conexiones del pool.
 */
export const publicRateLimit = rateLimit({
  windowMs: env.rateLimit.publico.windowMs,
  limit: env.rateLimit.publico.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      ApiError.tooManyRequests(
        'Demasiadas peticiones. Espera un momento e intenta de nuevo.'
      )
    )
  },
})

/**
 * Checkout: 10 por hora e IP. Más estricto que el catálogo porque cada llamada
 * escribe: da de alta un pedido y descuenta stock real.
 *
 * Un pedido rechazado no consume cupo, para que equivocarse al escribir el
 * documento no deje a nadie sin poder comprar.
 */
export const checkoutRateLimit = rateLimit({
  windowMs: env.rateLimit.checkout.windowMs,
  limit: env.rateLimit.checkout.max,
  skipFailedRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      ApiError.tooManyRequests(
        'Recibimos varios pedidos desde esta conexión. Espera un momento o escríbenos para completarlo.'
      )
    )
  },
})

/**
 * Formulario de contacto: 5 por hora e IP. Es el blanco clásico del envío
 * automático. Un envío rechazado no consume cupo.
 */
export const contactoRateLimit = rateLimit({
  windowMs: env.rateLimit.contacto.windowMs,
  limit: env.rateLimit.contacto.max,
  skipFailedRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      ApiError.tooManyRequests(
        'Ya recibimos varios mensajes desde esta conexión. Espera un momento o escríbenos por WhatsApp.'
      )
    )
  },
})
