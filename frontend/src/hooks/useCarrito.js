/**
 * Acceso cómodo y seguro al CarritoContext. Lanza si se usa fuera del provider.
 */

import { useContext } from 'react'
import { CarritoContext } from '@/context/CarritoContext.jsx'

export function useCarrito() {
  const ctx = useContext(CarritoContext)
  if (!ctx) {
    throw new Error('useCarrito debe usarse dentro de <CarritoProvider>')
  }
  return ctx
}
