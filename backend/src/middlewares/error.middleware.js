/**
 * Manejo CENTRALIZADO de errores + handler de rutas no encontradas.
 *
 *  - `notFound`: se monta al final; cualquier ruta sin match cae aquí -> 404.
 *  - `errorHandler`: middleware de 4 argumentos (Express lo reconoce como el
 *      manejador de errores). Traduce cualquier error a la respuesta JSON
 *      estándar y decide el status:
 *        · ApiError            -> usa su statusCode/errors.
 *        · Errores de Multer   -> 400 (p. ej. archivo demasiado grande).
 *        · Duplicados MySQL    -> 409 (ER_DUP_ENTRY).
 *        · Resto               -> 500 (y se loguea el stack).
 *
 *      Además se encarga de la LIMPIEZA DE ARCHIVOS HUÉRFANOS: Multer escribe la
 *      imagen en disco antes de que corran los validadores y los servicios, así
 *      que si la petición termina en error (422, 409, 500...) ese archivo no
 *      pertenece a ningún registro y hay que borrarlo. Al estar centralizado
 *      aquí, cubre por igual las cuatro rutas que aceptan imágenes (crear y
 *      actualizar productos y categorías) y cualquier otra que se agregue
 *      después, sin repetir la lógica en cada controlador.
 */

import multer from 'multer'
import { ApiError } from '../utils/ApiError.js'
import { isProduction } from '../config/env.js'
import { collectUploadedFiles, removeUploadedFile } from './upload.middleware.js'

/** Ruta inexistente -> 404 estandarizado. */
export function notFound(req, _res, next) {
  next(ApiError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`))
}

/** Manejador central de errores. Debe ir montado el ÚLTIMO. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  // Limpieza de huérfanos: si Multer alcanzó a guardar algo y la petición acabó
  // mal, el archivo no quedó asociado a ningún registro (la escritura en base no
  // llegó a completarse). Se borra en segundo plano, sin `await`, para no
  // demorar la respuesta; `removeUploadedFile` nunca lanza, de modo que no puede
  // reemplazar ni ocultar el error original.
  for (const file of collectUploadedFiles(req)) {
    removeUploadedFile(file).catch(() => {})
  }

  let statusCode = 500
  let message = 'Error interno del servidor'
  let errors = []

  if (err instanceof ApiError) {
    statusCode = err.statusCode
    message = err.message
    errors = err.errors
  } else if (err instanceof multer.MulterError) {
    // Errores propios de Multer (tamaño, campo inesperado, etc.).
    statusCode = 400
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'La imagen supera el tamaño máximo permitido'
        : `Error al subir el archivo: ${err.message}`
  } else if (err && err.code === 'ER_DUP_ENTRY') {
    // Violación de índice único en MySQL.
    statusCode = 409
    message = 'Ya existe un registro con esos datos únicos'
  } else if (err && err.type === 'entity.parse.failed') {
    // JSON malformado en el body.
    statusCode = 400
    message = 'El cuerpo de la petición no es un JSON válido'
  }

  // Loguea los errores no operacionales (bugs reales) para diagnóstico.
  if (statusCode >= 500) {
    console.error('[ERROR]', err)
  }

  const body = { success: false, message }
  if (errors.length) body.errors = errors
  // En desarrollo se incluye el stack para depurar.
  if (!isProduction && statusCode >= 500) body.stack = err.stack

  res.status(statusCode).json(body)
}
