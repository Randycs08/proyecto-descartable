/**
 * Vista de solo lectura de un pedido con todas sus líneas.
 *
 * El detalle guarda una "foto" del producto al momento de la venta: se muestra
 * `descripcion` y `precio_unitario` tal como quedaron registrados, no el nombre
 * ni el precio actuales del catálogo. Es a propósito: un pedido viejo tiene que
 * seguir diciendo lo que se vendió y a cuánto, aunque después se haya renombrado
 * el producto o cambiado la lista de precios.
 */

import { formatCurrency, formatDate } from '@/lib/utils.js'
import { METODOS_PAGO, ESTADOS_PAGO, etiquetaEstado, insigniaEstado } from '@/constants/pedidos.js'
import { Badge } from '@/components/ui/Badge.jsx'
import { Skeleton } from '@/components/ui/Skeleton.jsx'

/** Par etiqueta/valor de la ficha. */
function Dato({ label, children }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children || '—'}</dd>
    </div>
  )
}

export function PedidoDetalle({ pedido, loading }) {
  if (loading || !pedido) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  const estadoPago = ESTADOS_PAGO[pedido.estado_pago]

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-sm text-muted-foreground">{pedido.numero}</p>
          <p className="text-lg font-semibold text-foreground">{pedido.cliente_nombre || 'Sin cliente'}</p>
        </div>
        <Badge variant={insigniaEstado(pedido.estado)}>{etiquetaEstado(pedido.estado)}</Badge>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-md bg-muted/50 p-4 sm:grid-cols-3">
        <Dato label="Fecha">{formatDate(pedido.fecha_pedido)}</Dato>
        <Dato label="Registró">{pedido.usuario_nombre}</Dato>
        <Dato label="Método de pago">{METODOS_PAGO[pedido.metodo_pago] ?? pedido.metodo_pago}</Dato>
        <Dato label="Estado del pago">
          {estadoPago ? (
            <Badge variant={estadoPago.badge}>{estadoPago.label}</Badge>
          ) : (
            pedido.estado_pago
          )}
        </Dato>
        {/* Los pedidos anteriores a la migración 001 traen todo junto en
            `direccion_entrega` y distrito/referencia en NULL: por eso cada uno
            se dibuja solo si tiene contenido, y la ficha sirve para los dos. */}
        <div className="col-span-2 sm:col-span-1">
          <Dato label="Entrega">{pedido.direccion_entrega}</Dato>
        </div>
        <Dato label="Distrito">{pedido.distrito}</Dato>
        {pedido.referencia_entrega && (
          <div className="col-span-2">
            <Dato label="Referencia">{pedido.referencia_entrega}</Dato>
          </div>
        )}
      </dl>

      {/* Líneas */}
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Producto
              </th>
              <th className="w-16 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Cant.
              </th>
              <th className="hidden w-28 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">
                Precio
              </th>
              <th className="w-28 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {pedido.detalle?.map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  <p className="font-medium text-foreground">{l.descripcion}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.producto_sku ? `SKU ${l.producto_sku}` : 'Producto eliminado del catálogo'}
                    {Number(l.descuento) > 0 && ` · desc. ${formatCurrency(l.descuento)}`}
                  </p>
                </td>
                <td className="px-3 py-2 text-right text-foreground">{l.cantidad}</td>
                <td className="hidden px-3 py-2 text-right text-muted-foreground sm:table-cell">
                  {formatCurrency(l.precio_unitario)}
                </td>
                <td className="px-3 py-2 text-right font-medium text-foreground">
                  {formatCurrency(l.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totales */}
      <dl className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-medium text-foreground">{formatCurrency(pedido.subtotal)}</dd>
        </div>
        {Number(pedido.descuento) > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Descuento</dt>
            <dd className="font-medium text-destructive">− {formatCurrency(pedido.descuento)}</dd>
          </div>
        )}
        {Number(pedido.impuestos) > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Impuestos</dt>
            <dd className="font-medium text-foreground">{formatCurrency(pedido.impuestos)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-1.5 text-base">
          <dt className="font-semibold text-foreground">Total</dt>
          <dd className="font-bold text-foreground">{formatCurrency(pedido.total)}</dd>
        </div>
      </dl>

      {pedido.notas && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Notas</p>
          <p className="mt-1 whitespace-pre-line text-sm text-foreground">{pedido.notas}</p>
        </div>
      )}
    </div>
  )
}
