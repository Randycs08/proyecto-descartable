/**
 * Envoltorio sobre react-hot-toast para mostrar notificaciones consistentes.
 * `notifyError` sabe extraer el mensaje del error normalizado por api.js.
 */

import toast from 'react-hot-toast'

export const notify = {
  success: (message) => toast.success(message),
  error: (message) => toast.error(message),

  /** Muestra el mensaje de un error de la API (y el primer error de validación). */
  fromApiError(error, fallback = 'Ocurrió un error') {
    const base = error?.message || fallback
    const first = error?.errors?.[0]?.mensaje
    toast.error(first ? `${base}: ${first}` : base)
  },
}
