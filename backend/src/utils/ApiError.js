/**
 * Error de aplicación con código HTTP asociado.
 *
 * Permite lanzar errores "de negocio" con semántica HTTP desde cualquier capa
 * (servicios, controladores) y que el middleware central de errores sepa qué
 * status devolver. Los errores "operacionales" (isOperational=true) son
 * esperados (validación, no encontrado, etc.) y no deben tumbar el proceso.
 */

export class ApiError extends Error {
  /**
   * @param {number} statusCode  Código HTTP (400, 401, 404, 409, 500...).
   * @param {string} message     Mensaje legible para el cliente.
   * @param {Array}  [errors]    Detalle opcional (p. ej. errores de validación).
   */
  constructor(statusCode, message, errors = []) {
    super(message)
    this.statusCode = statusCode
    this.errors = errors
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }

  // Atajos para los errores más comunes -------------------------------------

  static badRequest(message = 'Solicitud inválida', errors = []) {
    return new ApiError(400, message, errors)
  }

  static unauthorized(message = 'No autenticado') {
    return new ApiError(401, message)
  }

  static forbidden(message = 'No autorizado') {
    return new ApiError(403, message)
  }

  static notFound(message = 'Recurso no encontrado') {
    return new ApiError(404, message)
  }

  static conflict(message = 'Conflicto con el estado actual del recurso') {
    return new ApiError(409, message)
  }

  static unprocessable(message = 'Datos no válidos', errors = []) {
    return new ApiError(422, message, errors)
  }

  static tooManyRequests(message = 'Demasiadas peticiones. Intentá de nuevo más tarde') {
    return new ApiError(429, message)
  }
}
