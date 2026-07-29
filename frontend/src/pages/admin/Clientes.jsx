/**
 * CRUD de clientes: listado con búsqueda, filtro por estado y paginación;
 * modales de creación/edición y confirmación de borrado; alta y baja lógica
 * desde la propia fila. Skeletons durante la carga y toasts en cada operación.
 *
 * La búsqueda tiene dos modos, porque la API ofrece dos consultas distintas:
 *   - "Nombre"    -> GET /clientes?search=...  (parcial y paginado; también
 *                    encuentra por razón social o documento)
 *   - "Documento" -> GET /clientes/documento/... (exacta; devuelve un cliente)
 */

import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Users, Power, Building2, User } from 'lucide-react'
import { clienteService } from '@/services/cliente.service.js'
import { useDebounce } from '@/hooks/useDebounce.js'
import { notify } from '@/lib/toast.js'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { Card } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Modal } from '@/components/ui/Modal.jsx'
import { Select } from '@/components/ui/Select.jsx'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table.jsx'
import { SkeletonTable } from '@/components/ui/Skeleton.jsx'
import { Pagination } from '@/components/ui/Pagination.jsx'
import { ClienteForm } from '@/components/clientes/ClienteForm.jsx'

export default function Clientes() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)

  // Filtros/paginación.
  const [search, setSearch] = useState('')
  const [modo, setModo] = useState('nombre') // 'nombre' | 'documento'
  const [estado, setEstado] = useState('') // '' | 'true' | 'false'
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 400)

  // Modales.
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Modo documento: consulta exacta, sin paginación (0 o 1 resultado).
      if (modo === 'documento' && debouncedSearch) {
        try {
          const cliente = await clienteService.getByDocumento(debouncedSearch.trim())
          setRows([cliente])
        } catch (err) {
          // El 404 acá no es un error a reportar: es "no hay coincidencias".
          if (err?.status !== 404) throw err
          setRows([])
        }
        setMeta(null)
        return
      }

      const params = { page, limit: 10 }
      if (debouncedSearch) params.search = debouncedSearch
      if (estado) params.activo = estado
      const { data, meta } = await clienteService.list(params)
      setRows(data)
      setMeta(meta)
    } catch (err) {
      notify.fromApiError(err, 'No se pudieron cargar los clientes')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, estado, modo])

  useEffect(() => { fetchData() }, [fetchData])

  // Al cambiar cualquier filtro, volver a la primera página.
  useEffect(() => { setPage(1) }, [debouncedSearch, estado, modo])

  // --- Acciones ---------------------------------------------------------------
  function openCreate() { setEditing(null); setFormOpen(true) }
  function openEdit(cliente) { setEditing(cliente); setFormOpen(true) }

  async function handleSubmit(payload) {
    setSubmitting(true)
    try {
      if (editing) {
        await clienteService.update(editing.id, payload)
        notify.success('Cliente actualizado')
      } else {
        await clienteService.create(payload)
        notify.success('Cliente creado')
      }
      setFormOpen(false)
      fetchData()
    } catch (err) {
      notify.fromApiError(err, 'No se pudo guardar el cliente')
    } finally {
      setSubmitting(false)
    }
  }

  /** Alta/baja lógica desde la fila. Es reversible, así que no pide confirmación. */
  async function handleToggleActivo(cliente) {
    setTogglingId(cliente.id)
    try {
      const activo = !cliente.activo
      await clienteService.setActivo(cliente.id, activo)
      notify.success(activo ? 'Cliente activado' : 'Cliente desactivado')
      fetchData()
    } catch (err) {
      notify.fromApiError(err, 'No se pudo cambiar el estado del cliente')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await clienteService.remove(toDelete.id)
      notify.success('Cliente eliminado')
      setToDelete(null)
      // Si borramos el último registro de la página, retrocedemos una.
      if (rows.length === 1 && page > 1) setPage((p) => p - 1)
      else fetchData()
    } catch (err) {
      notify.fromApiError(err, 'No se pudo eliminar el cliente')
    } finally {
      setDeleting(false)
    }
  }

  const hayFiltros = Boolean(debouncedSearch || estado)

  return (
    <div>
      <PageHeader title="Clientes" description="Administrá la base de clientes.">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nuevo cliente
        </Button>
      </PageHeader>

      <Card className="p-4">
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          placeholder={modo === 'documento' ? 'Documento exacto...' : 'Buscar por nombre o razón social...'}
        >
          <Select
            value={modo}
            onChange={(e) => setModo(e.target.value)}
            className="w-full sm:w-40"
            aria-label="Modo de búsqueda"
          >
            <option value="nombre">Por nombre</option>
            <option value="documento">Por documento</option>
          </Select>
          <Select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full sm:w-40"
            aria-label="Filtrar por estado"
            disabled={modo === 'documento' && Boolean(debouncedSearch)}
          >
            <option value="">Todos los estados</option>
            <option value="true">Solo activos</option>
            <option value="false">Solo inactivos</option>
          </Select>
        </Toolbar>

        {loading ? (
          <SkeletonTable rows={6} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No hay clientes"
            description={
              modo === 'documento' && debouncedSearch
                ? 'Ningún cliente tiene ese documento.'
                : hayFiltros
                  ? 'Prueba con otros filtros.'
                  : 'Carga tu primer cliente.'
            }
            action={
              !hayFiltros && (
                <Button onClick={openCreate} className="mt-2">
                  <Plus className="h-4 w-4" /> Nuevo cliente
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Cliente</TH>
                <TH className="hidden md:table-cell">Documento</TH>
                <TH className="hidden lg:table-cell">Contacto</TH>
                <TH className="hidden xl:table-cell">Ubicación</TH>
                <TH>Estado</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((c) => {
                const esEmpresa = Boolean(c.razon_social)
                const nombreCompleto = [c.nombre, c.apellido].filter(Boolean).join(' ')
                return (
                  <TR key={c.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                          {esEmpresa ? (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {esEmpresa ? c.razon_social : nombreCompleto}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {esEmpresa ? `Contacto: ${nombreCompleto}` : 'Persona'}
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD className="hidden md:table-cell text-sm">
                      {c.documento ? (
                        <>
                          <span className="text-muted-foreground">{c.tipo_documento}</span>{' '}
                          <span className="text-foreground">{c.documento}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TD>
                    <TD className="hidden lg:table-cell text-sm text-muted-foreground">
                      {c.email && <p className="truncate">{c.email}</p>}
                      {c.telefono && <p className="truncate">{c.telefono}</p>}
                      {!c.email && !c.telefono && '—'}
                    </TD>
                    <TD className="hidden xl:table-cell text-sm text-muted-foreground">
                      {[c.ciudad, c.provincia].filter(Boolean).join(', ') || '—'}
                    </TD>
                    <TD>
                      <Badge variant={c.activo ? 'success' : 'secondary'}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActivo(c)}
                          loading={togglingId === c.id}
                          aria-label={c.activo ? 'Desactivar' : 'Activar'}
                          title={c.activo ? 'Desactivar' : 'Activar'}
                          className={c.activo ? 'text-muted-foreground' : 'text-emerald-600'}
                        >
                          {togglingId !== c.id && <Power className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setToDelete(c)}
                          aria-label="Eliminar"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      {/* Modal crear/editar */}
      <Modal
        open={formOpen}
        onClose={() => !submitting && setFormOpen(false)}
        title={editing ? 'Editar cliente' : 'Nuevo cliente'}
        description={
          editing
            ? `Editando "${editing.razon_social || [editing.nombre, editing.apellido].filter(Boolean).join(' ')}"`
            : 'Completa los datos del cliente.'
        }
        size="lg"
      >
        <ClienteForm
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
          submitting={submitting}
        />
      </Modal>

      {/* Confirmar eliminación */}
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar cliente"
        description={
          `¿Seguro que quieres eliminar a "${toDelete?.razon_social || [toDelete?.nombre, toDelete?.apellido].filter(Boolean).join(' ')}"? ` +
          'No se puede si ya tiene pedidos: en ese caso, desactívalo.'
        }
        confirmText="Eliminar"
      />
    </div>
  )
}
