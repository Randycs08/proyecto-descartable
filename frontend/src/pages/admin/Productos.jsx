/**
 * CRUD de productos: listado con búsqueda, filtro por categoría y paginación;
 * modales de creación/edición y confirmación de borrado. Miniatura de imagen,
 * skeletons y toasts.
 */

import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Package, ImageIcon } from 'lucide-react'
import { productoService } from '@/services/producto.service.js'
import { categoriaService } from '@/services/categoria.service.js'
import { useDebounce } from '@/hooks/useDebounce.js'
import { notify } from '@/lib/toast.js'
import { formatCurrency, resolveImageUrl } from '@/lib/utils.js'
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
import { ProductoForm } from '@/components/productos/ProductoForm.jsx'

export default function Productos() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [categorias, setCategorias] = useState([])

  // Filtros/paginación.
  const [search, setSearch] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 400)

  // Modales.
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Categorías para el filtro (una sola vez).
  useEffect(() => {
    categoriaService
      .list({ limit: 100 })
      .then((res) => setCategorias(res.data))
      .catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 10 }
      if (debouncedSearch) params.search = debouncedSearch
      if (categoriaId) params.categoriaId = categoriaId
      const { data, meta } = await productoService.list(params)
      setRows(data)
      setMeta(meta)
    } catch (err) {
      notify.fromApiError(err, 'No se pudieron cargar los productos')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, categoriaId])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { setPage(1) }, [debouncedSearch, categoriaId])

  // --- Acciones ---------------------------------------------------------------
  function openCreate() { setEditing(null); setFormOpen(true) }
  function openEdit(p) { setEditing(p); setFormOpen(true) }

  async function handleSubmit(payload) {
    setSubmitting(true)
    try {
      if (editing) {
        await productoService.update(editing.id, payload)
        notify.success('Producto actualizado')
      } else {
        await productoService.create(payload)
        notify.success('Producto creado')
      }
      setFormOpen(false)
      fetchData()
    } catch (err) {
      notify.fromApiError(err, 'No se pudo guardar el producto')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await productoService.remove(toDelete.id)
      notify.success('Producto eliminado')
      setToDelete(null)
      if (rows.length === 1 && page > 1) setPage((p) => p - 1)
      else fetchData()
    } catch (err) {
      notify.fromApiError(err, 'No se pudo eliminar el producto')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Productos" description="Administrá el catálogo de productos.">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nuevo producto
        </Button>
      </PageHeader>

      <Card className="p-4">
        <Toolbar search={search} onSearchChange={setSearch} placeholder="Buscar por nombre o SKU...">
          <Select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="w-full sm:w-52"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </Select>
        </Toolbar>

        {loading ? (
          <SkeletonTable rows={6} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No hay productos"
            description={debouncedSearch || categoriaId ? 'Prueba con otros filtros.' : 'Crea tu primer producto.'}
            action={
              !debouncedSearch && !categoriaId && (
                <Button onClick={openCreate} className="mt-2">
                  <Plus className="h-4 w-4" /> Nuevo producto
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Producto</TH>
                <TH className="hidden md:table-cell">Categoría</TH>
                <TH>Precio</TH>
                <TH>Stock</TH>
                <TH className="hidden sm:table-cell">Estado</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((p) => {
                const img = resolveImageUrl(p.imagen_url)
                return (
                  <TR key={p.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                          {img ? (
                            <img src={img} alt={p.nombre} className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{p.nombre}</p>
                          <p className="text-xs text-muted-foreground">SKU {p.sku}</p>
                        </div>
                        {p.destacado && <Badge variant="warning">★</Badge>}
                      </div>
                    </TD>
                    <TD className="hidden md:table-cell text-sm text-muted-foreground">
                      {p.categoria_nombre}
                    </TD>
                    <TD className="font-semibold text-foreground">{formatCurrency(p.precio)}</TD>
                    <TD>
                      <Badge variant={p.stock <= p.stock_minimo ? 'destructive' : 'success'}>
                        {p.stock} {p.unidad_medida}
                      </Badge>
                    </TD>
                    <TD className="hidden sm:table-cell">
                      <Badge variant={p.activo ? 'success' : 'secondary'}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setToDelete(p)}
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

        {!loading && rows.length > 0 && <Pagination meta={meta} onPageChange={setPage} />}
      </Card>

      {/* Modal crear/editar */}
      <Modal
        open={formOpen}
        onClose={() => !submitting && setFormOpen(false)}
        title={editing ? 'Editar producto' : 'Nuevo producto'}
        description={editing ? `Editando "${editing.nombre}"` : 'Completa los datos del producto.'}
        size="lg"
      >
        <ProductoForm
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
        title="Eliminar producto"
        description={`¿Seguro que quieres eliminar "${toDelete?.nombre}"?`}
        confirmText="Eliminar"
      />
    </div>
  )
}
