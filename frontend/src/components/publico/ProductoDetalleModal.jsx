/**
 * Ficha del producto para el visitante, dentro del Modal del sistema de diseño.
 *
 * Se abre con los datos que ya trajo el listado —así no hay pantalla en blanco—
 * y en paralelo se vuelve a pedir el producto por su slug. El precio y el stock
 * de una tarjeta pueden tener varios minutos si el visitante estuvo navegando, y
 * son justo los dos datos que no conviene mostrar desactualizados.
 *
 * La imagen (y su marcador cuando no hay foto) se delega en `ImagenProducto`,
 * el mismo componente que usan las tarjetas: así la ficha y la grilla muestran
 * exactamente la misma pieza.
 */

import { useEffect, useState } from 'react'
import { ShoppingCart, MessageCircle, Plus, Minus } from 'lucide-react'
import { publicoService, linkWhatsApp } from '@/services/publico.service.js'
import { useCarrito } from '@/hooks/useCarrito.js'
import { notify } from '@/lib/toast.js'
import { formatCurrency } from '@/lib/utils.js'
import { Modal } from '@/components/ui/Modal.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { DisponibilidadBadge } from './ProductoCard.jsx'
import { ImagenProducto } from './ImagenProducto.jsx'

/** Par etiqueta/valor de la ficha técnica. */
function Dato({ label, children }) {
  if (!children) return null
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{children}</dd>
    </div>
  )
}

export function ProductoDetalleModal({ producto, onClose, config }) {
  const [detalle, setDetalle] = useState(producto)
  const [cantidad, setCantidad] = useState(1)
  const { agregar, abrir } = useCarrito()

  // Refresca precio y stock al abrir. Si falla, se sigue mostrando lo que ya
  // había: un error de red no debe vaciar una ficha que ya estaba en pantalla.
  useEffect(() => {
    setDetalle(producto)
    setCantidad(1)
    if (!producto?.slug) return

    let active = true
    publicoService
      .getProducto(producto.slug)
      .then((fresco) => { if (active) setDetalle(fresco) })
      .catch(() => {})
    return () => { active = false }
  }, [producto])

  if (!detalle) return null

  const agotado = detalle.stock <= 0
  const whatsapp = linkWhatsApp(
    config?.whatsapp,
    `¡Hola! Quisiera consultar por "${detalle.nombre}" (${detalle.sku}).`
  )

  return (
    <Modal open={Boolean(producto)} onClose={onClose} title={detalle.nombre} size="lg">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <ImagenProducto
          src={detalle.imagen_url}
          nombre={detalle.nombre}
          categoria={detalle.categoria_nombre}
          atenuada={agotado}
          className="rounded-lg"
        />

        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            {detalle.categoria_nombre && <Badge variant="secondary">{detalle.categoria_nombre}</Badge>}
            <DisponibilidadBadge stock={detalle.stock} />
          </div>

          <p className="mt-3 text-3xl font-bold leading-none text-foreground">
            {formatCurrency(detalle.precio)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Precio por {detalle.unidad_medida || 'unidad'}
            {detalle.unidades_por_paquete > 0 &&
              ` · ${formatCurrency(detalle.precio / detalle.unidades_por_paquete)} por unidad`}
          </p>

          <dl className="mt-4 divide-y divide-border border-y border-border">
            <Dato label="Código">{detalle.sku}</Dato>
            <Dato label="Marca">{detalle.marca_nombre}</Dato>
            <Dato label="Presentación">{detalle.unidad_medida}</Dato>
            <Dato label="Unidades por paquete">{detalle.unidades_por_paquete}</Dato>
            <Dato label="Stock disponible">
              {agotado ? 'Sin stock' : `${detalle.stock} ${detalle.unidad_medida || 'u.'}`}
            </Dato>
          </dl>
        </div>
      </div>

      {detalle.descripcion && (
        <div className="mt-5">
          <h4 className="text-sm font-semibold text-foreground">Descripción</h4>
          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
            {detalle.descripcion}
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {!agotado && (
          <div className="flex items-center rounded-md border border-input">
            <button
              type="button"
              onClick={() => setCantidad((c) => Math.max(1, c - 1))}
              disabled={cantidad <= 1}
              aria-label="Quitar una unidad"
              className="px-3 py-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-10 text-center text-sm font-medium text-foreground">{cantidad}</span>
            <button
              type="button"
              onClick={() => setCantidad((c) => Math.min(detalle.stock, c + 1))}
              disabled={cantidad >= detalle.stock}
              aria-label="Agregar una unidad"
              className="px-3 py-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}

        <Button
          className="flex-1"
          disabled={agotado}
          onClick={() => {
            agregar(detalle, cantidad)
            notify.success(`"${detalle.nombre}" agregado al carrito`)
            onClose()
            abrir()
          }}
        >
          <ShoppingCart className="h-4 w-4" />
          {agotado ? 'Sin stock' : 'Agregar al carrito'}
        </Button>

        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="outline" className="w-full">
              <MessageCircle className="h-4 w-4" /> Consultar
            </Button>
          </a>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        El pago se coordina al confirmar el pedido: no se cobra nada en línea.
      </p>
    </Modal>
  )
}
