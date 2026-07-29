/**
 * Confirmación con el número de pedido.
 *
 * Los datos llegan por el `state` de la navegación, no por una nueva consulta:
 * la respuesta del checkout ya trae todo, y volver a pedirlo obligaría a exponer
 * un endpoint público de consulta de pedidos —cualquiera podría ir probando
 * números y leer las compras de otros—.
 *
 * Como contrapartida, recargar la página pierde el `state`. Por eso se muestra
 * un aviso claro con el número anotado en pantalla en lugar de una página rota.
 */

import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2, Package2, MessageCircle, FileQuestion } from 'lucide-react'
import { linkWhatsApp } from '@/services/publico.service.js'
import { useConfiguracionPublica } from '@/components/layout/PublicLayout.jsx'
import { formatCurrency, formatDate } from '@/lib/utils.js'
import { Card, CardContent } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'

export default function PedidoConfirmado() {
  const { state } = useLocation()
  const config = useConfiguracionPublica()
  const pedido = state?.pedido

  if (!pedido) {
    return (
      <div className="container-site py-16">
        <Card>
          <EmptyState
            icon={FileQuestion}
            title="No encontramos los datos del pedido"
            description="Si acabas de hacer uno, ya quedó registrado: revisa el número que te mostramos o escríbenos y lo verificamos."
            action={
              <Link to="/catalogo" className="mt-2">
                <Button variant="outline">Volver al catálogo</Button>
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  const whatsapp = linkWhatsApp(
    config?.whatsapp,
    `¡Hola! Acabo de hacer el pedido ${pedido.numero} desde la web.`
  )

  return (
    <div className="container-site max-w-2xl py-14">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">¡Pedido registrado!</h1>
        <p className="max-w-md text-muted-foreground">
          Nos vamos a comunicar para confirmar la entrega y coordinar el pago.
        </p>
        <div className="mt-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-8 py-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Número de pedido</p>
          <p className="font-mono text-2xl font-bold tracking-wider text-foreground sm:text-3xl">{pedido.numero}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Anótalo: es la referencia para cualquier consulta.
        </p>
      </div>

      <Card className="mt-8">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-semibold text-foreground">Detalle</h2>
          <Badge variant="warning">Pendiente de confirmación</Badge>
        </div>

        <ul className="divide-y divide-border">
          {pedido.detalle?.map((linea, i) => (
            <li key={`${linea.descripcion}-${i}`} className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded bg-muted">
                <Package2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{linea.descripcion}</p>
                <p className="text-xs text-muted-foreground">
                  {linea.cantidad} × {formatCurrency(linea.precio_unitario)}
                </p>
              </div>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(linea.subtotal)}</p>
            </li>
          ))}
        </ul>

        <CardContent className="space-y-2 p-5">
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="font-semibold text-foreground">Total</span>
            <span className="text-xl font-bold text-foreground">{formatCurrency(pedido.total)}</span>
          </div>
          <dl className="space-y-1 pt-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Fecha</dt>
              <dd className="text-foreground">{formatDate(pedido.fecha_pedido)}</dd>
            </div>
            {pedido.direccion_entrega && (
              <div className="flex justify-between gap-4">
                <dt className="flex-shrink-0 text-muted-foreground">Entrega</dt>
                <dd className="text-right text-foreground">
                  {[pedido.direccion_entrega, pedido.distrito].filter(Boolean).join(', ')}
                </dd>
              </div>
            )}
            {pedido.referencia_entrega && (
              <div className="flex justify-between gap-4">
                <dt className="flex-shrink-0 text-muted-foreground">Referencia</dt>
                <dd className="text-right text-foreground">{pedido.referencia_entrega}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer">
            <Button className="w-full sm:w-auto">
              <MessageCircle className="h-4 w-4" /> Avisar por WhatsApp
            </Button>
          </a>
        )}
        <Link to="/catalogo">
          <Button variant="outline" className="w-full sm:w-auto">Seguir comprando</Button>
        </Link>
      </div>
    </div>
  )
}
