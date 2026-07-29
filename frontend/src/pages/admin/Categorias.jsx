/**
 * CRUD de categorías: listado con búsqueda + paginación, y modales para
 * crear/editar/eliminar. Muestra skeletons durante la carga y toasts en cada
 * operación.
 */

import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Tags } from 'lucide-react'
import { categoriaService } from '@/services/categoria.service.js'
import { useDebounce } from '@/hooks/useDebounce.js'
import { notify } from '@/lib/toast.js'
import { formatDate } from '@/lib/utils.js'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { Card } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Modal } from '@/components/ui/Modal.jsx'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table.jsx'
import { SkeletonTable } from '@/components/ui/Skeleton.jsx'
import { Pagination } from '@/components/ui/Pagination.jsx'
import { CategoriaForm } from '@/components/categorias/CategoriaForm.jsx'

export default function Categorias() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)

  // Filtros/paginación.
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 400)

  // Estado de los modales.
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Carga los datos desde la API con los filtros actuales.
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 10 }
      if (debouncedSearch) params.search = debouncedSearch
      const { data, meta } = await categoriaService.list(params)
      setRows(data)
      setMeta(meta)
    } catch (err) {
      notify.fromApiError(err, 'No se pudieron cargar las categorías')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => { fetchData() }, [fetchData])

  // Al cambiar la búsqueda, volver a la primera página.
  useEffect(() => { setPage(1) }, [debouncedSearch])

  // --- Acciones ---------------------------------------------------------------
  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(cat) {
    setEditing(cat)
    setFormOpen(true)
  }

  async function handleSubmit(payload) {
    setSubmitting(true)
    try {
      if (editing) {
        await categoriaService.update(editing.id, payload)
        notify.success('Categoría actualizada')
      } else {
        await categoriaService.create(payload)
        notify.success('Categoría creada')
      }
      setFormOpen(false)
      fetchData()
    } catch (err) {
      notify.fromApiError(err, 'No se pudo guardar la categoría')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await categoriaService.remove(toDelete.id)
      notify.success('Categoría eliminada')
      setToDelete(null)
      // Si borramos el último registro de la página, retrocedemos una.
      if (rows.length === 1 && page > 1) setPage((p) => p - 1)
      else fetchData()
    } catch (err) {
      notify.fromApiError(err, 'No se pudo eliminar la categoría')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Categorías" description="Gestioná los rubros del catálogo.">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nueva categoría
        </Button>
      </PageHeader>

      <Card className="p-4">
        <Toolbar search={search} onSearchChange={setSearch} placeholder="Buscar categoría..." />

        {loading ? (
          <SkeletonTable rows={6} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="No hay categorías"
            description={debouncedSearch ? 'Prueba con otra búsqueda.' : 'Crea tu primera categoría.'}
            action={
              !debouncedSearch && (
                <Button onClick={openCreate} className="mt-2">
                  <Plus className="h-4 w-4" /> Nueva categoría
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Nombre</TH>
                <TH className="hidden md:table-cell">Slug</TH>
                <TH className="hidden sm:table-cell">Orden</TH>
                <TH>Estado</TH>
                <TH className="hidden lg:table-cell">Creada</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((cat) => (
                <TR key={cat.id}>
                  <TD>
                    <p className="font-medium text-foreground">{cat.nombre}</p>
                    {cat.descripcion && (
                      <p className="max-w-xs truncate text-xs text-muted-foreground">
                        {cat.descripcion}
                      </p>
                    )}
                  </TD>
                  <TD className="hidden md:table-cell">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{cat.slug}</code>
                  </TD>
                  <TD className="hidden sm:table-cell text-muted-foreground">{cat.orden}</TD>
                  <TD>
                    <Badge variant={cat.activo ? 'success' : 'secondary'}>
                      {cat.activo ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </TD>
                  <TD className="hidden lg:table-cell text-sm text-muted-foreground">
                    {formatDate(cat.created_at)}
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(cat)} aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToDelete(cat)}
                        aria-label="Eliminar"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}

        {!loading && rows.length > 0 && <Pagination meta={meta} onPageChange={setPage} />}
      </Card>

      {/* Modal crear/editar */}
      <Modal
        open={formOpen}
        onClose={() => !submitting && setFormOpen(false)}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
        description={editing ? `Editando "${editing.nombre}"` : 'Completa los datos de la categoría.'}
      >
        <CategoriaForm
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
        title="Eliminar categoría"
        description={`¿Seguro que quieres eliminar "${toDelete?.nombre}"? No se puede si tiene productos asociados.`}
        confirmText="Eliminar"
      />
    </div>
  )
}
