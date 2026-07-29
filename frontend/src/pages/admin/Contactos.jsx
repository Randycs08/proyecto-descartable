/**
 * Bandeja de los mensajes que llegan del formulario del sitio.
 *
 * El schema de `contacto` define UN solo estado: `leido`. No hay "respondido" ni
 * "cerrado", así que la pantalla no los ofrece — una casilla que la base no
 * puede guardar se destildaría sola al recargar.
 *
 * Tampoco hay borrado: la tabla no tiene columna de baja, y eliminar sería
 * físico. Un mensaje atendido se marca como leído y queda.
 *
 * Abrir un mensaje lo marca como leído, que es lo que uno espera de una bandeja;
 * el marcado es reversible desde la misma fila por si se abrió sin querer.
 */

import { useCallback, useEffect, useState } from 'react'
import { Mail, MailOpen, Eye, Inbox, Phone, AtSign } from 'lucide-react'
import { contactoService, ORDENES_CONTACTO } from '@/services/contacto.service.js'
import { useDebounce } from '@/hooks/useDebounce.js'
import { notify } from '@/lib/toast.js'
import { formatDate } from '@/lib/utils.js'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { Card } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Modal } from '@/components/ui/Modal.jsx'
import { Select } from '@/components/ui/Select.jsx'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table.jsx'
import { SkeletonTable } from '@/components/ui/Skeleton.jsx'
import { Pagination } from '@/components/ui/Pagination.jsx'

export default function Contactos() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)

  // Filtros/paginación.
  const [search, setSearch] = useState('')
  const [leido, setLeido] = useState('')      // '' | 'true' | 'false'
  const [orden, setOrden] = useState('recientes')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 400)

  // Detalle.
  const [detalle, setDetalle] = useState(null)
  const [detalleLoading, setDetalleLoading] = useState(false)
  const [marcandoId, setMarcandoId] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 10, orden }
      if (debouncedSearch) params.search = debouncedSearch
      if (leido) params.leido = leido
      const { data, meta } = await contactoService.list(params)
      setRows(data)
      setMeta(meta)
    } catch (err) {
      notify.fromApiError(err, 'No se pudieron cargar los mensajes')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, leido, orden])

  useEffect(() => { fetchData() }, [fetchData])

  // Al cambiar cualquier filtro, volver a la primera página.
  useEffect(() => { setPage(1) }, [debouncedSearch, leido, orden])

  /**
   * Abre el mensaje completo. El listado solo trae un resumen, así que se pide
   * la ficha; si además estaba sin leer, se marca.
   */
  async function abrirDetalle(mensaje) {
    setDetalle(mensaje)
    setDetalleLoading(true)
    try {
      const completo = await contactoService.get(mensaje.id)
      setDetalle(completo)

      if (!completo.leido) {
        await contactoService.setLeido(mensaje.id, true)
        setRows((actuales) =>
          actuales.map((m) => (m.id === mensaje.id ? { ...m, leido: true } : m))
        )
        setMeta((m) => (m ? { ...m, sinLeer: Math.max(0, (m.sinLeer ?? 1) - 1) } : m))
      }
    } catch (err) {
      notify.fromApiError(err, 'No se pudo abrir el mensaje')
      setDetalle(null)
    } finally {
      setDetalleLoading(false)
    }
  }

  /** Marca o desmarca desde la fila. Reversible a propósito. */
  async function alternarLeido(mensaje) {
    setMarcandoId(mensaje.id)
    try {
      const actualizado = await contactoService.setLeido(mensaje.id, !mensaje.leido)
      notify.success(actualizado.leido ? 'Marcado como leído' : 'Marcado como no leído')
      fetchData()
    } catch (err) {
      notify.fromApiError(err, 'No se pudo cambiar el estado')
    } finally {
      setMarcandoId(null)
    }
  }

  const hayFiltros = Boolean(debouncedSearch || leido || orden !== 'recientes')

  return (
    <div>
      <PageHeader title="Mensajes" description="Consultas recibidas desde el formulario del sitio.">
        {meta?.sinLeer > 0 && (
          <Badge variant="warning">
            {meta.sinLeer} sin leer
          </Badge>
        )}
      </PageHeader>

      <Card className="p-4">
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Buscar por nombre, correo, asunto o contenido..."
        >
          <Select
            value={leido}
            onChange={(e) => setLeido(e.target.value)}
            className="w-full sm:w-40"
            aria-label="Filtrar por estado"
          >
            <option value="">Todos</option>
            <option value="false">Sin leer</option>
            <option value="true">Leídos</option>
          </Select>
          <Select
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            className="w-full sm:w-44"
            aria-label="Ordenar por fecha"
          >
            {ORDENES_CONTACTO.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Toolbar>

        {loading ? (
          <SkeletonTable rows={6} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No hay mensajes"
            description={
              hayFiltros
                ? 'Prueba con otros filtros.'
                : 'Cuando alguien escriba desde el sitio, su consulta aparece aquí.'
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Remitente</TH>
                <TH className="hidden md:table-cell">Asunto</TH>
                <TH className="hidden lg:table-cell">Mensaje</TH>
                <TH>Fecha</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((m) => (
                <TR key={m.id} className={m.leido ? '' : 'bg-primary/5'}>
                  <TD>
                    <div className="flex items-center gap-2">
                      {!m.leido && (
                        <span
                          className="h-2 w-2 flex-shrink-0 rounded-full bg-primary"
                          aria-label="Sin leer"
                        />
                      )}
                      <div className="min-w-0">
                        <p className={`truncate ${m.leido ? 'text-foreground' : 'font-semibold text-foreground'}`}>
                          {m.nombre}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                  </TD>
                  <TD className="hidden md:table-cell">
                    <p className="max-w-[14rem] truncate text-sm text-foreground">
                      {m.asunto || <span className="text-muted-foreground">Sin asunto</span>}
                    </p>
                  </TD>
                  <TD className="hidden lg:table-cell">
                    <p className="max-w-[22rem] truncate text-sm text-muted-foreground">
                      {m.resumen}{m.recortado && '…'}
                    </p>
                  </TD>
                  <TD className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(m.created_at)}
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => abrirDetalle(m)}
                        aria-label="Ver mensaje"
                        title="Ver mensaje"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => alternarLeido(m)}
                        loading={marcandoId === m.id}
                        aria-label={m.leido ? 'Marcar como no leído' : 'Marcar como leído'}
                        title={m.leido ? 'Marcar como no leído' : 'Marcar como leído'}
                      >
                        {marcandoId !== m.id && (
                          m.leido
                            ? <Mail className="h-4 w-4" />
                            : <MailOpen className="h-4 w-4 text-primary" />
                        )}
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}

        {!loading && rows.length > 0 && meta && <Pagination meta={meta} onPageChange={setPage} />}
      </Card>

      {/* Detalle */}
      <Modal
        open={Boolean(detalle)}
        onClose={() => setDetalle(null)}
        title={detalle?.asunto || 'Mensaje sin asunto'}
        description={detalle ? `Recibido el ${formatDate(detalle.created_at)}` : ''}
        size="lg"
      >
        {detalle && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 rounded-md bg-muted/50 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Remitente</p>
                <p className="mt-0.5 text-sm font-medium text-foreground">{detalle.nombre}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Estado</p>
                <p className="mt-0.5">
                  <Badge variant={detalle.leido ? 'secondary' : 'warning'}>
                    {detalle.leido ? 'Leído' : 'Sin leer'}
                  </Badge>
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Correo</p>
                <a
                  href={`mailto:${detalle.email}`}
                  className="mt-0.5 flex items-center gap-1 truncate text-sm text-primary hover:underline"
                >
                  <AtSign className="h-3.5 w-3.5 flex-shrink-0" /> {detalle.email}
                </a>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Teléfono</p>
                {detalle.telefono ? (
                  <a
                    href={`tel:${detalle.telefono}`}
                    className="mt-0.5 flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" /> {detalle.telefono}
                  </a>
                ) : (
                  <p className="mt-0.5 text-sm text-muted-foreground">No indicó</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Mensaje</p>
              {detalleLoading ? (
                <p className="mt-2 text-sm text-muted-foreground">Cargando...</p>
              ) : (
                <p className="mt-2 whitespace-pre-line text-sm text-foreground">{detalle.mensaje}</p>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <a href={`mailto:${detalle.email}?subject=${encodeURIComponent(`Re: ${detalle.asunto || 'Tu consulta'}`)}`}>
                <Button className="w-full sm:w-auto">
                  <Mail className="h-4 w-4" /> Responder por correo
                </Button>
              </a>
              <Button
                variant="outline"
                onClick={async () => {
                  await alternarLeido(detalle)
                  setDetalle((d) => (d ? { ...d, leido: !d.leido } : d))
                }}
                className="w-full sm:w-auto"
              >
                {detalle.leido ? 'Marcar como no leído' : 'Marcar como leído'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
