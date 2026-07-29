/**
 * Tarjeta de producto del sitio público. La usan la portada y el catálogo, así
 * que la ficha se ve igual en los dos lados.
 *
 * Decisiones de presentación:
 *
 *  - Proporción de imagen FIJA (cuadrada) para todas: es lo que mantiene la
 *    grilla alineada aunque las fotos que suba el negocio vengan de distintos
 *    tamaños. La imagen y su marcador viven en `ImagenProducto`.
 *
 *  - El precio es el elemento de mayor peso visual de la tarjeta. En una tienda
 *    es el dato que se busca primero, y antes competía con el nombre.
 *
 *  - La disponibilidad se muestra como cinta sobre la imagen y no como texto
 *    suelto: se lee de un vistazo al recorrer la grilla.
 *
 * La API pública no expone `stock_minimo` —es un umbral interno—, así que el
 * aviso de "últimas unidades" usa un corte propio del sitio.
 */

import { ShoppingCart, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useCarrito } from '@/hooks/useCarrito.js'
import { notify } from '@/lib/toast.js'
import { formatCurrency } from '@/lib/utils.js'
import { Card } from '@/components/ui/Card.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { ImagenProducto } from './ImagenProducto.jsx'

/** Debajo de esta cantidad se avisa que quedan pocas unidades. */
const UMBRAL_POCAS = 10

/** Insignia de disponibilidad a partir del stock publicado. */
export function DisponibilidadBadge({ stock }) {
  if (stock <= 0) return <Badge variant="secondary">Sin stock</Badge>
  if (stock <= UMBRAL_POCAS) return <Badge variant="brand">Últimas unidades</Badge>
  return <Badge variant="success">Disponible</Badge>
}

export function ProductoCard({ producto, onSelect }) {
  const { agregar, abrir } = useCarrito()
  const [agregado, setAgregado] = useState(false)
  const temporizador = useRef(null)
  const agotado = producto.stock <= 0

  // Si la tarjeta se desmonta antes de que pase el aviso (al filtrar el catálogo
  // o cambiar de página), el temporizador queda vivo intentando actualizar algo
  // que ya no está.
  useEffect(() => () => clearTimeout(temporizador.current), [])

  function agregarAlCarrito() {
    agregar(producto, 1)
    notify.success(`"${producto.nombre}" agregado al carrito`)
    // Confirmación breve en el propio botón: al abrirse el panel el foco se va,
    // y sin esta marca no queda claro qué tarjeta se tocó.
    setAgregado(true)
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => setAgregado(false), 1500)
    abrir()
  }

  // El botón de agregar es HERMANO del que abre la ficha, no está dentro: un
  // <button> anidado en otro no es HTML válido y el navegador lo desarma.
  return (
    <Card className="group flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevada">
      <button
        type="button"
        onClick={() => onSelect(producto)}
        aria-label={`Ver detalle de ${producto.nombre}`}
        className="flex w-full flex-1 flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <div className="relative">
          <ImagenProducto
            src={producto.imagen_url}
            nombre={producto.nombre}
            categoria={producto.categoria_nombre}
            atenuada={agotado}
            zoom
          />
          <div className="absolute left-2 top-2">
            <DisponibilidadBadge stock={producto.stock} />
          </div>
          {producto.destacado && !agotado && (
            <div className="absolute right-2 top-2">
              <Badge variant="solid">Destacado</Badge>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {producto.categoria_nombre || 'Sin categoría'}
          </p>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
            {producto.nombre}
          </h3>

          <p className="text-xs text-muted-foreground">
            {producto.unidades_por_paquete
              ? `${producto.unidades_por_paquete} u. por ${producto.unidad_medida || 'paquete'}`
              : `Por ${producto.unidad_medida || 'unidad'}`}
          </p>

          <div className="mt-auto pt-3">
            <p className="text-xl font-bold leading-none text-foreground">
              {formatCurrency(producto.precio)}
            </p>
            {producto.unidades_por_paquete > 0 && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatCurrency(producto.precio / producto.unidades_por_paquete)} por unidad
              </p>
            )}
          </div>
        </div>
      </button>

      <div className="px-4 pb-4">
        <Button
          size="sm"
          variant={agotado ? 'outline' : 'default'}
          className="w-full"
          disabled={agotado}
          onClick={agregarAlCarrito}
          aria-label={agotado ? `${producto.nombre} sin stock` : `Agregar ${producto.nombre} al carrito`}
        >
          {agregado ? (
            <><Check className="h-4 w-4" /> Agregado</>
          ) : (
            <><ShoppingCart className="h-4 w-4" /> {agotado ? 'Sin stock' : 'Agregar'}</>
          )}
        </Button>
      </div>
    </Card>
  )
}
