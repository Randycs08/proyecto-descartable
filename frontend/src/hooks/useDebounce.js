/**
 * Devuelve una versión "retardada" de un valor. Útil para no disparar una
 * búsqueda en la API con cada tecla, sino tras una pausa de escritura.
 */

import { useEffect, useState } from 'react'

export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
