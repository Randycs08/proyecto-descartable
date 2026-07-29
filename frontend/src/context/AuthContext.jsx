/**
 * Estado global de autenticación (Context API).
 *
 * Responsabilidades:
 *  - Guardar el usuario y el token en memoria + localStorage.
 *  - Al montar, si hay token, valida la sesión con GET /auth/me.
 *  - Exponer login() / logout() al resto de la app.
 *
 * El consumo se hace con el hook `useAuth()` (ver hooks/useAuth.js).
 */

import { createContext, useEffect, useMemo, useState } from 'react'
import { authService } from '@/services/auth.service.js'
import { TOKEN_KEY } from '@/services/api.js'

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  // `loading` = estamos verificando la sesión inicial (evita parpadeos/redirects).
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)))

  // Al arrancar: si hay token, recupera el perfil. Si falla, limpia la sesión.
  useEffect(() => {
    let active = true
    async function bootstrap() {
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const perfil = await authService.me()
        if (active) setUser(perfil)
      } catch {
        if (active) {
          localStorage.removeItem(TOKEN_KEY)
          setToken(null)
          setUser(null)
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    bootstrap()
    return () => { active = false }
    // Solo en el montaje.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Inicia sesión: guarda token+usuario y persiste el token. */
  async function login(email, password) {
    const { token: newToken, usuario } = await authService.login(email, password)
    localStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken)
    setUser(usuario)
    return usuario
  }

  /** Cierra sesión: notifica al backend y limpia el estado local. */
  async function logout() {
    await authService.logout()
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [user, token, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
