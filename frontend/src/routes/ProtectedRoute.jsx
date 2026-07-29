/**
 * Guarda de rutas privadas (JWT). Mientras se verifica la sesión inicial
 * muestra un spinner; si no hay usuario autenticado, redirige a /login
 * recordando la ruta de origen (para volver tras el login).
 *
 * `roles` (opcional): restringe el acceso a determinados roles.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth.js'
import { FullPageSpinner } from '@/components/ui/Spinner.jsx'

export function ProtectedRoute({ roles }) {
  const { isAuthenticated, loading, user } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageSpinner label="Verificando sesión..." />

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Restricción por rol (si se especificó).
  if (roles && !roles.includes(user?.rol)) {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}
