/**
 * Listado de pedidos con búsqueda por número, filtro por estado y paginación.
 * Desde cada fila se ve el detalle, se avanza el estado y se cancela.
 *
 * Tres cosas que distinguen esta pantalla del resto del panel:
 *
 *  - No hay edición. Un pedido ya descontó stock; cambiarle las líneas obligaría
 *    a recalcular el inventario. Se crea, se avanza de estado o se cancela.
 *
 *  - El diálogo de estado solo ofrece las transiciones válidas desde el estado
 *    actual (ver constants/pedidos.js). El backend las vuelve a verificar: acá
 *    se evita el 409, no se confía en el navegador.
 *
 *  - Cancelar es la única acción irreversible y repone el stock, así que se
 *    muestra únicamente a los roles que la API autoriza (Administrador y
 *    Empleado); un vendedor no ve el botón.
 */

import { useCallback, useEffect, useState } from 'react'
import { Plus, Eye, Ban, ArrowRightCircle, ShoppingCart } from 'lucide-react'
import { pedidoService } from '@/services/pedido.service.js'
import { useDebounce } from '@/hooks/useDebounce.js'
import { useAuth } from '@/hooks/useAuth.js'
import { notify } from '@/lib/toast.js'
import { formatCurrency, formatDate } from '@/lib/utils.js'
import { ESTADOS_PEDIDO, ESTADOS_PAGO, TRANSICIONES, etiquetaEstado, insigniaEstado } from '@/constants/pedidos.js'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { Card } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Modal } from '@/components/ui/Modal.jsx'
import { Select } from '@/components/ui/Select.jsx'
import { Textarea } from '@/components/ui/Textarea.jsx'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table.jsx'
import { SkeletonTable } from '@/components/ui/Skeleton.jsx'
import { Pagination } from '@/components/ui/Pagination.jsx'
import { PedidoForm } from '@/components/pedidos/PedidoForm.jsx'
import { PedidoDetalle } from '@/components/pedidos/PedidoDetalle.jsx'

/** Roles que la API autoriza a cancelar (ver routes/pedido.routes.js). */
const GESTORES = ['Administrador', 'Empleado']

export default function Pedidos() {
  const { user } = useAuth()
  const puedeCancelar = GESTORES.includes(user?.rol)

  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)

  // Filtros/paginación.
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 400)

  // Modales.
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [detalle, setDetalle] = useState(null)      // pedido completo o null
  const [detalleLoading, setDetalleLoading] = useState(false)
  const [cambiando, setCambiando] = useState(null)  // pedido cuyo estado se cambia
  const [nuevoEstado, setNuevoEstado] = useState(null)
  const [cancelando, setCancelando] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [accionando, setAccionando] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 10 }
      if (debouncedSearch) params.search = debouncedSearch
      if (estado) params.estado = estado
      const { data, meta } = await pedidoService.list(params)
      setRows(data)
      setMeta(meta)
    } catch (err) {
      notify.fromApiError(err, 'No se pudieron cargar los pedidos')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, estado])

  useEffect(() => { fetchData() }, [fetchData])

  // Al cambiar cualquier filtro, volver a la primera página.
  useEffect(() => { setPage(1) }, [debouncedSearch, estado])

  // --- Acciones ---------------------------------------------------------------
  async function handleCreate(payload) {
    setSubmitting(true)
    try {
      const pedido = await pedidoService.create(payload)
      notify.success(`Pedido ${pedido.numero} creado`)
      setFormOpen(false)
      // Un pedido nuevo es el más reciente: se vuelve a la primera página.
      if (page !== 1) setPage(1)
      else fetchData()
    } catch (err) {
      notify.fromApiError(err, 'No se pudo crear el pedido')
    } finally {
      setSubmitting(false)
    }
  }

  /** El listado no trae el detalle: se pide el pedido completo al abrir la ficha. */
  async function abrirDetalle(pedido) {
    setDetalle({ ...pedido, detalle: [] })
    setDetalleLoading(true)
    try {
      setDetalle(await pedidoService.get(pedido.id))
    } catch (err) {
      notify.fromApiError(err, 'No se pudo cargar el pedido')
      setDetalle(null)
    } finally {
      setDetalleLoading(false)
    }
  }

  async function handleCambiarEstado() {
    if (!cambiando || !nuevoEstado) return
    setAccionando(true)
    try {
      await pedidoService.updateEstado(cambiando.id, nuevoEstado)
      notify.success(`Pedido ${cambiando.numero}: ${etiquetaEstado(nuevoEstado).toLowerCase()}`)
      setCambiando(null)
      fetchData()
    } catch (err) {
      notify.fromApiError(err, 'No se pudo cambiar el estado')
    } finally {
      setAccionando(false)
    }
  }

  async function handleCancelar() {
    if (!cancelando) return
    setAccionando(true)
    try {
      await pedidoService.cancel(cancelando.id, motivo.trim())
      notify.success(`Pedido ${cancelando.numero} cancelado. El stock volvió al inventario`)
      setCancelando(null)
      setMotivo('')
      fetchData()
    } catch (err) {
      notify.fromApiError(err, 'No se pudo cancelar el pedido')
    } finally {
      setAccionando(false)
    }
  }

  function abrirCambioEstado(pedido) {
    setCambiando(pedido)
    setNuevoEstado(null)
  }

  const hayFiltros = Boolean(debouncedSearch || estado)

  // Cancelar tiene su propio diálogo (pide motivo y repone stock), así que no
  // aparece entre las transiciones de este otro.
  const transicionesDisponibles = (TRANSICIONES[cambiando?.estado] ?? []).filter((e) => e !== 'cancelado')

  return (
    <div>
      <PageHeader title="Pedidos" description="Registra y da seguimiento a los pedidos de tus clientes.">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> Nuevo pedido
        </Button>
      </PageHeader>

      <Card className="p-4">
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Buscar por número de pedido..."
        >
          <Select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full sm:w-48"
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS_PEDIDO).map(([valor, { label }]) => (
              <option key={valor} value={valor}>{label}</option>
            ))}
          </Select>
        </Toolbar>

        {loading ? (
          <SkeletonTable rows={6} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No hay pedidos"
            description={hayFiltros ? 'Prueba con otros filtros.' : 'Registra tu primer pedido.'}
            action={
              !hayFiltros && (
                <Button onClick={() => setFormOpen(true)} className="mt-2">
                  <Plus className="h-4 w-4" /> Nuevo pedido
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Pedido</TH>
                <TH>Cliente</TH>
                <TH>Estado</TH>
                <TH className="hidden md:table-cell">Pago</TH>
                <TH className="text-right">Total</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((p) => {
                const pago = ESTADOS_PAGO[p.estado_pago]
                const puedeAvanzar = (TRANSICIONES[p.estado] ?? []).some((e) => e !== 'cancelado')
                const admiteCancelacion = (TRANSICIONES[p.estado] ?? []).includes('cancelado')
                return (
                  <TR key={p.id}>
                    <TD>
                      <p className="font-mono text-sm font-medium text-foreground">{p.numero}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.fecha_pedido)}</p>
                    </TD>
                    <TD>
                      <p className="max-w-[16rem] truncate text-sm text-foreground">
                        {p.cliente_nombre || 'Sin cliente'}
                      </p>
                    </TD>
                    <TD>
                      <Badge variant={insigniaEstado(p.estado)}>{etiquetaEstado(p.estado)}</Badge>
                    </TD>
                    <TD className="hidden md:table-cell">
                      {pago ? (
                        <Badge variant={pago.badge}>{pago.label}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TD>
                    <TD className="text-right font-medium text-foreground">
                      {formatCurrency(p.total)}
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => abrirDetalle(p)}
                          aria-label="Ver detalle"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => abrirCambioEstado(p)}
                          disabled={!puedeAvanzar}
                          aria-label="Cambiar estado"
                          title={puedeAvanzar ? 'Cambiar estado' : 'El pedido ya no admite cambios'}
                        >
                          <ArrowRightCircle className="h-4 w-4" />
                        </Button>
                        {puedeCancelar && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setCancelando(p); setMotivo('') }}
                            disabled={!admiteCancelacion}
                            aria-label="Cancelar pedido"
                            title={admiteCancelacion ? 'Cancelar pedido' : 'Este pedido ya no se puede cancelar'}
                            className="text-destructive hover:text-destructive"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        )}

        {!loading && rows.length > 0 && meta && <Pagination meta={meta} onPageChange={setPage} />}
      </Card>

      {/* Alta */}
      <Modal
        open={formOpen}
        onClose={() => !submitting && setFormOpen(false)}
        title="Nuevo pedido"
        description="Selecciona el cliente y agrega los productos."
        size="xl"
      >
        <PedidoForm onSubmit={handleCreate} onCancel={() => setFormOpen(false)} submitting={submitting} />
      </Modal>

      {/* Detalle */}
      <Modal
        open={Boolean(detalle)}
        onClose={() => setDetalle(null)}
        title="Detalle del pedido"
        size="lg"
      >
        <PedidoDetalle pedido={detalle} loading={detalleLoading} />
      </Modal>

      {/* Cambio de estado */}
      <Modal
        open={Boolean(cambiando)}
        onClose={() => !accionando && setCambiando(null)}
        title="Cambiar estado"
        description={cambiando ? `Pedido ${cambiando.numero}` : ''}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCambiando(null)} disabled={accionando}>
              Cancelar
            </Button>
            <Button onClick={handleCambiarEstado} loading={accionando} disabled={!nuevoEstado}>
              Confirmar
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-muted-foreground">
          Estado actual:{' '}
          <Badge variant={insigniaEstado(cambiando?.estado)}>{etiquetaEstado(cambiando?.estado)}</Badge>
        </p>
        {transicionesDisponibles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este pedido no admite más cambios de estado.
          </p>
        ) : (
          <div className="space-y-2">
            {transicionesDisponibles.map((valor) => (
              <button
                key={valor}
                type="button"
                onClick={() => setNuevoEstado(valor)}
                className={
                  'flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition-colors ' +
                  (nuevoEstado === valor
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border hover:bg-accent')
                }
              >
                <span className="font-medium">{etiquetaEstado(valor)}</span>
                <Badge variant={insigniaEstado(valor)}>{etiquetaEstado(valor)}</Badge>
              </button>
            ))}
          </div>
        )}
      </Modal>

      {/* Cancelación */}
      <Modal
        open={Boolean(cancelando)}
        onClose={() => !accionando && setCancelando(null)}
        title="Cancelar pedido"
        description={cancelando ? `Pedido ${cancelando.numero}` : ''}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelando(null)} disabled={accionando}>
              Volver
            </Button>
            <Button variant="destructive" onClick={handleCancelar} loading={accionando}>
              Cancelar pedido
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          El pedido queda cancelado y las unidades reservadas vuelven al stock.
          Esta acción no se puede deshacer.
        </p>
        <div className="mt-4 space-y-1.5">
          <label htmlFor="pe-motivo" className="text-sm font-medium text-foreground">
            Motivo <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <Textarea
            id="pe-motivo"
            rows={2}
            value={motivo}
            maxLength={500}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="El cliente se arrepintió"
          />
          <p className="text-xs text-muted-foreground">Queda asentado en las notas del pedido.</p>
        </div>
      </Modal>
    </div>
  )
}
