/**
 * Instancia central de Axios con INTERCEPTORES.
 *
 *  - Request interceptor : adjunta el token JWT (Authorization: Bearer ...) si
 *    existe en localStorage.
 *  - Response interceptor: normaliza los errores y, ante un 401 (token
 *    inválido/expirado), limpia la sesión y redirige a /login.
 *
 * El resto de servicios usa esta instancia, por lo que la autenticación y el
 * manejo de errores quedan centralizados.
 */

import axios from 'axios'

// Clave de almacenamiento del token (reutilizada por el AuthContext).
export const TOKEN_KEY = 'descartables_token'

// baseURL configurable por variable de entorno; por defecto usa el proxy de Vite.
const baseURL = import.meta.env.VITE_API_URL || '/api'

// IMPORTANTE: no se fija un Content-Type por defecto a nivel de instancia.
// Axios ya elige el correcto según el cuerpo de cada petición:
//   - objeto plano  -> application/json
//   - FormData      -> multipart/form-data; boundary=... (necesario para subir
//                      imágenes en categorías/productos).
// Si se forzara 'application/json' aquí, axios serializaría el FormData a JSON y
// el archivo se perdería (la subida de imágenes quedaría rota).
export const api = axios.create({
  baseURL,
})

// --- Request: adjunta el token ------------------------------------------------
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// --- Response: normaliza errores y maneja 401 --------------------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const data = error.response?.data

    // Sesión inválida/expirada: limpiar y redirigir (salvo en el propio login).
    if (status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY)
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/login'
      }
    }

    // Se re-lanza un error con un mensaje legible y los detalles de validación.
    return Promise.reject({
      status,
      message: data?.message || error.message || 'Error de conexión',
      errors: data?.errors || [],
      raw: error,
    })
  }
)
