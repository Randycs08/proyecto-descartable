/**
 * Panel de inicio con métricas reales. Todo el contenido sale de una única
 * llamada a GET /estadisticas/resumen: ventas del período con su comparación
 * contra el anterior, pedidos por estado, situación del inventario y clientes.
 *
 * Dos cosas a tener presentes al leer esta pantalla:
 *
 *  - El selector de período afecta a lo que es un FLUJO (ventas, pedidos, altas
 *    de clientes), no a lo que es una FOTO del momento (catálogo, stock, total
 *    de clientes). Es la misma distinción que hace el backend y por eso esas
 *    tarjetas no muestran variación.
 *
 *  - El endpoint está reservado a Administrador y Empleado. Cualquier otro rol
 *    ve la vista reducida (DashboardVendedor), tanto por el rol del usuario como
 *    si la API devolviera 403: así la página de inicio nunca queda rota.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DollarSign, ShoppingCart, Receipt, AlertTriangle, ArrowRight,
  Package, Users, Boxes,
} from 'lucide-react'
import { estadisticaService, rangoDelPeriodo, PERIODOS } from '@/services/estadistica.service.js'
import { notify } from '@/lib/toast.js'
import { formatCurrency, formatDate } from '@/lib/utils.js'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { Card, CardContent } from '@/components/ui/Card.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Select } from '@/components/ui/Select.jsx'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton.jsx'
import { StatCard } from '@/components/dashboard/StatCard.jsx'
import DashboardVendedor from '@/components/dashboard/DashboardVendedor.jsx'
import { useAuth } from '@/hooks/useAuth.js'

/** Roles con acceso al resumen (mismo criterio que routes/estadistica.routes.js). */
const GESTORES = ['Administrador', 'Empleado']

/** Presentación de los estados de pedido (etiqueta, insignia y color de barra). */
const ESTADOS = {
  pendiente:  { label: 'Pendiente',  badge: 'warning',     barra: 'bg-amber-500' },
  confirmado: { label: 'Confirmado', badge: 'default',     barra: 'bg-primary' },
  en_proceso: { label: 'En proceso', badge: 'default',     barra: 'bg-sky-500' },
  enviado:    { label: 'Enviado',    badge: 'secondary',   barra: 'bg-indigo-500' },
  entregado:  { label: 'Entregado',  badge: 'success',     barra: 'bg-emerald-500' },
  cancelado:  { label: 'Cancelado',  badge: 'destructive', barra: 'bg-destructive' },
}

/** Encabezado de las tarjetas de listado, con enlace opcional al módulo. */
function CardHeading({ title, to, linkLabel = 'Ver todos' }) {
  return (
    <div className="flex items-center justify-between border-b border-border p-5">
      <h3 className="font-semibold text-foreground">{title}</h3>
      {to && (
        <Link to={to} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          {linkLabel} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}

/** Filas de esqueleto para las tarjetas de listado. */
function SkeletonRows({ rows = 4 }) {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()

  const [periodo, setPeriodo] = useState('30')
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  // Se activa si la API rechaza el resumen por permisos: se cae a la vista reducida.
  const [sinPermiso, setSinPermiso] = useState(false)

  const esGestor = GESTORES.includes(user?.rol)
  const verMetricas = esGestor && !sinPermiso

  const rango = useMemo(() => rangoDelPeriodo(periodo), [periodo])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      setResumen(await estadisticaService.getResumen(rango))
    } catch (err) {
      // El 403 no es un fallo a reportar: es un rol sin acceso a las métricas.
      if (err?.status === 403) setSinPermiso(true)
      else notify.fromApiError(err, 'No se pudieron cargar las métricas')
    } finally {
      setLoading(false)
    }
  }, [rango])

  useEffect(() => {
    if (esGestor) fetchData()
    else setLoading(false)
  }, [esGestor, fetchData])

  const totalPedidos = resumen?.pedidos.total ?? 0

  return (
    <div>
      <PageHeader
        title={`Hola, ${user?.nombre || 'usuario'} 👋`}
        description={
          verMetricas
            ? 'Resumen general de tu tienda de descartables.'
            : 'Accesos y datos del catálogo.'
        }
      >
        {verMetricas && (
          <Select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="w-full sm:w-48"
            aria-label="Período de las métricas"
            disabled={loading}
          >
            {PERIODOS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </Select>
        )}
      </PageHeader>

      {!verMetricas ? (
        <DashboardVendedor />
      ) : (
        <>
          {/* Métricas del período */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading || !resumen ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              <>
                <StatCard
                  title="Ventas del período"
                  value={formatCurrency(resumen.ventas.total)}
                  icon={DollarSign}
                  tone="emerald"
                  trend={resumen.ventas.variacion.total}
                />
                <StatCard
                  title="Pedidos"
                  value={resumen.ventas.pedidos}
                  icon={ShoppingCart}
                  tone="primary"
                  trend={resumen.ventas.variacion.pedidos}
                />
                <StatCard
                  title="Ticket promedio"
                  value={formatCurrency(resumen.ventas.ticketPromedio)}
                  icon={Receipt}
                  tone="slate"
                  trend={resumen.ventas.variacion.ticketPromedio}
                />
                <StatCard
                  title="Stock bajo"
                  value={resumen.inventario.stockBajo}
                  icon={AlertTriangle}
                  tone="red"
                  hint={`${resumen.inventario.sinStock} sin stock · ≤ stock mínimo`}
                />
              </>
            )}
          </div>

          {/* Pedidos: últimos movimientos y reparto por estado */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeading title="Pedidos recientes" to="/admin/pedidos" />
              {loading || !resumen ? (
                <SkeletonRows />
              ) : resumen.pedidos.recientes.length === 0 ? (
                <EmptyState
                  icon={ShoppingCart}
                  title="Todavía no hay pedidos"
                  description="Cuando cargues el primero aparecerá aquí."
                />
              ) : (
                <div className="divide-y divide-border">
                  {resumen.pedidos.recientes.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {p.cliente_nombre || 'Sin cliente'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.numero} · {formatDate(p.fecha_pedido)}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-3">
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(p.total)}
                        </span>
                        <Badge variant={ESTADOS[p.estado]?.badge || 'secondary'}>
                          {ESTADOS[p.estado]?.label || p.estado}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardHeading title="Pedidos por estado" />
              {loading || !resumen ? (
                <SkeletonRows rows={5} />
              ) : totalPedidos === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">
                  Sin pedidos en el período seleccionado.
                </p>
              ) : (
                <CardContent className="space-y-3 p-5">
                  {Object.entries(resumen.pedidos.porEstado).map(([estado, cantidad]) => {
                    const porcentaje = Math.round((cantidad / totalPedidos) * 100)
                    return (
                      <div key={estado}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-foreground">{ESTADOS[estado]?.label || estado}</span>
                          <span className="text-muted-foreground">
                            {cantidad} <span className="text-xs">({porcentaje}%)</span>
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${ESTADOS[estado]?.barra || 'bg-primary'}`}
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              )}
            </Card>
          </div>

          {/* Inventario y clientes */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeading title="Productos por reponer" to="/admin/productos" />
              {loading || !resumen ? (
                <SkeletonRows />
              ) : resumen.inventario.productosStockBajo.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="Sin faltantes"
                  description="Ningún producto activo está por debajo de su stock mínimo."
                />
              ) : (
                <div className="divide-y divide-border">
                  {resumen.inventario.productosStockBajo.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{p.nombre}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.categoria_nombre || 'Sin categoría'} · SKU {p.sku}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          mín. {p.stock_minimo}
                        </span>
                        <Badge variant={p.stock === 0 ? 'destructive' : 'warning'}>
                          {p.stock} {p.unidad_medida || 'u.'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeading title="Clientes" to="/admin/clientes" />
                {loading || !resumen ? (
                  <SkeletonRows rows={3} />
                ) : (
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{resumen.clientes.total}</p>
                        <p className="text-xs text-muted-foreground">
                          {resumen.clientes.activos} activos · {resumen.clientes.inactivos} inactivos
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {resumen.clientes.nuevosEnPeriodo}
                      </span>{' '}
                      nuevos en el período
                    </p>

                    {resumen.clientes.topCompradores.length > 0 && (
                      <div className="mt-4 border-t border-border pt-4">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Top compradores
                        </p>
                        <ul className="space-y-2">
                          {resumen.clientes.topCompradores.map((c) => (
                            <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                              <span className="min-w-0 truncate text-foreground">{c.nombre}</span>
                              <span className="flex-shrink-0 font-medium text-foreground">
                                {formatCurrency(c.total)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>

              <Card>
                <CardHeading title="Inventario valorizado" />
                {loading || !resumen ? (
                  <SkeletonRows rows={2} />
                ) : (
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                        <Boxes className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xl font-bold text-foreground">
                          {formatCurrency(resumen.inventario.valorVenta)}
                        </p>
                        <p className="text-xs text-muted-foreground">a precio de venta</p>
                      </div>
                    </div>
                    <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Valor a costo</dt>
                        <dd className="font-medium text-foreground">
                          {formatCurrency(resumen.inventario.valorCosto)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Productos activos</dt>
                        <dd className="font-medium text-foreground">
                          {resumen.inventario.productosActivos} / {resumen.inventario.productos}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Categorías</dt>
                        <dd className="font-medium text-foreground">{resumen.inventario.categorias}</dd>
                      </div>
                    </dl>
                  </CardContent>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
