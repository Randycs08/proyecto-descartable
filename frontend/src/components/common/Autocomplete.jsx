/**
 * Buscador con lista desplegable de resultados.
 *
 * Existe porque un <select> no sirve para elegir entre catálogos que crecen: en
 * el alta de un pedido hay que buscar un cliente entre cientos y un producto
 * entre miles. Cargar todo en un desplegable dejaría de funcionar apenas el
 * negocio crezca, así que se consulta a la API a medida que se escribe.
 *
 * Es controlado por el que lo usa: recibe `onSearch` (la consulta) y `onSelect`
 * (qué hacer con lo elegido); no sabe nada de clientes ni de productos.
 *
 * Accesible con teclado: ↑/↓ recorren, Enter elige, Escape cierra.
 */

import { useEffect, useRef, useState } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce.js'
import { cn } from '@/lib/utils.js'

export function Autocomplete({
  id,
  value = null,
  onSelect,
  onSearch,
  getKey = (item) => item.id,
  getLabel = (item) => item.nombre,
  renderItem,
  placeholder = 'Buscar...',
  emptyText = 'Sin resultados',
  disabled = false,
  invalid = false,
}) {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [resaltado, setResaltado] = useState(0)

  const contenedor = useRef(null)
  const debounced = useDebounce(query, 300)

  // Cierra al hacer clic fuera. Sin esto el desplegable queda flotando sobre el
  // resto del formulario.
  useEffect(() => {
    function alClicFuera(e) {
      if (contenedor.current && !contenedor.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', alClicFuera)
    return () => document.removeEventListener('mousedown', alClicFuera)
  }, [])

  // Búsqueda. `activo` descarta respuestas de consultas ya viejas: si la lenta
  // llegara después de la nueva, pisaría los resultados correctos.
  useEffect(() => {
    if (!abierto) return
    let activo = true
    setCargando(true)
    Promise.resolve(onSearch(debounced))
      .then((res) => { if (activo) { setItems(res); setResaltado(0) } })
      .catch(() => { if (activo) setItems([]) })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
    // `onSearch` se recrea en cada render del padre; incluirlo dispararía un
    // bucle de consultas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, abierto])

  function elegir(item) {
    onSelect(item)
    setQuery('')
    setAbierto(false)
  }

  function limpiar() {
    onSelect(null)
    setQuery('')
    setAbierto(false)
  }

  function alTeclear(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAbierto(true)
      setResaltado((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setResaltado((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      // Sin este preventDefault, Enter enviaría el formulario del pedido.
      e.preventDefault()
      if (abierto && items[resaltado]) elegir(items[resaltado])
    } else if (e.key === 'Escape') {
      setAbierto(false)
    }
  }

  // Con algo elegido, el campo muestra la etiqueta y no se escribe encima.
  const textoVisible = value ? getLabel(value) : query

  return (
    <div ref={contenedor} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={abierto}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          value={textoVisible}
          placeholder={placeholder}
          readOnly={Boolean(value)}
          onChange={(e) => { setQuery(e.target.value); setAbierto(true) }}
          onFocus={() => { if (!value) setAbierto(true) }}
          onKeyDown={alTeclear}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 pr-9 text-sm',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            value && 'cursor-default font-medium',
            invalid && 'border-destructive'
          )}
        />
        {cargando && !value && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {value && !disabled && (
          <button
            type="button"
            onClick={limpiar}
            aria-label="Quitar selección"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {abierto && !value && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-card py-1 shadow-lg"
        >
          {cargando && items.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Buscando...</li>
          ) : items.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</li>
          ) : (
            items.map((item, i) => (
              <li key={getKey(item)} role="option" aria-selected={i === resaltado}>
                <button
                  type="button"
                  onMouseEnter={() => setResaltado(i)}
                  onClick={() => elegir(item)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm transition-colors',
                    i === resaltado ? 'bg-accent text-accent-foreground' : 'text-foreground'
                  )}
                >
                  {renderItem ? renderItem(item) : getLabel(item)}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
