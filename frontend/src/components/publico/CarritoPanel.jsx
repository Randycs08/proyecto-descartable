/**
 * Panel lateral del carrito. Se abre desde el botón del encabezado y acompaña al
 * visitante por todo el sitio, así que no es una página: no le hace perder el
 * lugar del catálogo.
 *
 * Los importes que muestra son orientativos —salen de la copia guardada en el
 * navegador—; el que vale es el que calcula el servidor al confirmar. La
 * pantalla de checkout vuelve a consultar cada artículo antes del resumen final.
 */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Plus, Minus, Trash2, ShoppingCart, ArrowRight } from 'lucide-react'
import { useCarrito } from '@/hooks/useCarrito.js'
import { formatCurrency } from '@/lib/utils.js'
import { Button } from '@/components/ui/Button.jsx'
import { ImagenProducto } from './ImagenProducto.jsx'

export function CarritoPanel() {
  const { items, abierto, cerrar, cambiarCantidad, quitar, subtotal, unidades, vacio } = useCarrito()

  // Cierre con Escape y bloqueo del scroll de fondo, igual que el Modal.
  useEffect(() => {
    if (!abierto) return
    const alTeclear = (e) => e.key === 'Escape' && cerrar()
    document.addEventListener('keydown', alTeclear)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = ''
    }
  }, [abierto, cerrar])

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={cerrar} aria-hidden="true" />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-elevada animate-slide-in-derecha"
      >
        <header className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Tu carrito</h2>
            <p className="text-sm text-muted-foreground">
              {unidades} {unidades === 1 ? 'unidad' : 'unidades'}
            </p>
          </div>
          <button
            onClick={cerrar}
            aria-label="Cerrar carrito"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {vacio ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <ShoppingCart className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">Tu carrito está vacío</p>
            <p className="text-sm text-muted-foreground">
              Agrega productos desde el catálogo para empezar tu pedido.
            </p>
            <Link to="/catalogo" onClick={cerrar}>
              <Button variant="outline" className="mt-2">Ver catálogo</Button>
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-border overflow-y-auto">
              {items.map((item) => {
                const sinStock = item.stock <= 0
                const excede = item.cantidad > item.stock

                return (
                  <li key={item.id} className="flex gap-3 p-4 transition-colors hover:bg-muted/40">
                    <ImagenProducto
                      src={item.imagen_url}
                      nombre={item.nombre}
                      atenuada={sinStock}
                      className="h-16 w-16 flex-shrink-0 rounded-md"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{item.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.precio)} c/{item.unidad_medida || 'u.'}
                      </p>

                      {(sinStock || excede) && (
                        <p className="mt-1 text-xs font-medium text-destructive">
                          {sinStock ? 'Sin stock disponible' : `Solo quedan ${item.stock}`}
                        </p>
                      )}

                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center rounded-md border border-input">
                          <button
                            type="button"
                            onClick={() => cambiarCantidad(item.id, Math.max(1, item.cantidad - 1))}
                            disabled={item.cantidad <= 1}
                            aria-label={`Quitar una unidad de ${item.nombre}`}
                            className="px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-8 px-1 text-center text-sm font-medium text-foreground">
                            {item.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}
                            aria-label={`Agregar una unidad de ${item.nombre}`}
                            className="px-2 py-1 text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => quitar(item.id)}
                          aria-label={`Quitar ${item.nombre} del carrito`}
                          className="rounded p-1 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <p className="flex-shrink-0 text-sm font-semibold text-foreground">
                      {formatCurrency(item.precio * item.cantidad)}
                    </p>
                  </li>
                )
              })}
            </ul>

            <footer className="border-t border-border bg-muted/30 p-5">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-sm text-muted-foreground">Subtotal estimado</span>
                  <p className="text-[11px] text-muted-foreground">
                    {unidades} {unidades === 1 ? 'unidad' : 'unidades'}
                  </p>
                </div>
                <span className="text-2xl font-bold leading-none text-foreground">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                El importe final se confirma al registrar el pedido.
              </p>
              <Link to="/checkout" onClick={cerrar}>
                <Button className="mt-4 w-full" size="lg">
                  Continuar con el pedido <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <button
                type="button"
                onClick={cerrar}
                className="mt-2 w-full rounded-md py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Seguir comprando
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}
