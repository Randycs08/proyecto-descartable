/**
 * Llamadas a los endpoints de autenticación. Devuelven directamente el `data`
 * de la respuesta estándar del backend ({ success, message, data }).
 */

import { api } from './api.js'

export const authService = {
  /** POST /auth/login -> { token, usuario } */
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    return data.data
  },

  /** POST /auth/logout */
  async logout() {
    try {
      await api.post('/auth/logout')
    } catch {
      // Aunque falle en el servidor, el cliente descarta el token igual.
    }
  },

  /** GET /auth/me -> usuario */
  async me() {
    const { data } = await api.get('/auth/me')
    return data.data
  },
}
