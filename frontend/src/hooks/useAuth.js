/**
 * Acceso cómodo y seguro al AuthContext. Lanza si se usa fuera del provider.
 */

import { useContext } from 'react'
import { AuthContext } from '@/context/AuthContext.jsx'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return ctx
}
