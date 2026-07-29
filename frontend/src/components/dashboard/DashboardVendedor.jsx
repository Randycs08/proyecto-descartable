/**
 * Vista reducida del panel para el rol Vendedor.
 *
 * El resumen de estadísticas (GET /estadisticas/resumen) expone facturación y
 * valor del inventario, así que el backend lo reserva a Administrador y
 * Empleado. Como el Dashboard es la página de inicio, un vendedor caería en una
 * pantalla con 403: en su lugar ve este panel, armado solo con los endpoints a
 * los que sí tiene acceso y SIN importes.
 *
 * Los totales salen del `meta.total` de cada listado (se pide `limit: 1`, no
 * hacen falta las filas) y no de contar en el navegador, que dejaría de ser
 * cierto al pasar la primera página.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Tags, Users, Star, ArrowRight } from 'lucide-react'
import { productoService } from '@/services/producto.service.js'
import { categoriaService } from '@/services/categoria.service.js'
import { clienteService } from '@/services/cliente.service.js'
import { notify } from '@/lib/toast.js'
import { Card, CardContent } from '@/components/ui/Card.jsx'
import { SkeletonCard } from '@/components/ui/Skeleton.jsx'
import { StatCard } from '@/components/dashboard/StatCard.jsx'

/** Accesos directos a los módulos habilitados para el vendedor. */
const ACCESOS = [
  { to: '/admin/productos', label: 'Productos', description: 'Consultar precios y stock', icon: Package },
  { to: '/admin/clientes', label: 'Clientes', description: 'Alta y consulta de clientes', icon: Users },
]

export default function DashboardVendedor() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ productos: 0, categorias: 0, clientes: 0, destacados: 0 })

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [productos, categorias, clientes, destacados] = await Promise.all([
          productoService.list({ activo: true, limit: 1 }),
          categoriaService.list({ limit: 1 }),
          clienteService.list({ activo: true, limit: 1 }),
          productoService.list({ destacado: true, limit: 1 }),
        ])
        if (!active) return
        setStats({
          productos: productos.meta?.total ?? 0,
          categorias: categorias.meta?.total ?? 0,
          clientes: clientes.meta?.total ?? 0,
          destacados: destacados.meta?.total ?? 0,
        })
      } catch (err) {
        notify.fromApiError(err, 'No se pudieron cargar los datos del panel')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard title="Productos activos" value={stats.productos} icon={Package} tone="primary" />
            <StatCard title="Categorías" value={stats.categorias} icon={Tags} tone="emerald" />
            <StatCard title="Clientes activos" value={stats.clientes} icon={Users} tone="slate" />
            <StatCard title="Destacados" value={stats.destacados} icon={Star} tone="amber" />
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ACCESOS.map(({ to, label, description, icon: Icon }) => (
          <Link key={to} to={to} className="group">
            <Card className="transition-colors hover:border-primary/40 hover:bg-accent">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{label}</p>
                  <p className="truncate text-sm text-muted-foreground">{description}</p>
                </div>
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Las métricas de facturación e inventario valorizado están reservadas a los
        perfiles de administración.
      </p>
    </>
  )
}
