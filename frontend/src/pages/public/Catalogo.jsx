/**
 * Catálogo público: listado paginado con búsqueda, filtro por categoría,
 * disponibilidad y orden.
 *
 * Los filtros viven en la URL (`?search=&categoria=&orden=`) y no solo en el
 * estado del componente. Es lo que permite compartir un enlace a "vasos
 * ordenados por precio" o volver con el botón atrás sin perder la selección,
 * que en una tienda es lo esperable.
 *
 * Todo sale de `/api/public/*`: nunca se piden productos inactivos porque la API
 * pública directamente no los ofrece.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, PackageSearch, X } from 'lucide-react'
import { publicoService, ORDENES } from '@/services/publico.service.js'
import { useConfiguracionPublica } from '@/components/layout/PublicLayout.jsx'
import { useDebounce } from '@/hooks/useDebounce.js'
import { Input } from '@/components/ui/Input.jsx'
import { Select } from '@/components/ui/Select.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Card, CardContent } from '@/components/ui/Card.jsx'
import { Skeleton } from '@/components/ui/Skeleton.jsx'
import { Pagination } from '@/components/ui/Pagination.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { ProductoCard } from '@/components/publico/ProductoCard.jsx'
import { ProductoDetalleModal } from '@/components/publico/ProductoDetalleModal.jsx'

const POR_PAGINA = 12

/** Esqueleto de una tarjeta mientras carga el listado. */
function SkeletonProducto() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-square w-full rounded-none" />
      <CardContent className="space-y-2 p-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-6 w-24" />
      </CardContent>
    </Card>
  )
}

export default function Catalogo() {
  const config = useConfiguracionPublica()
  const [params, setParams] = useSearchParams()

  // La URL es la fuente de verdad de los filtros; el input de texto lleva su
  // propio estado para poder escribir sin reescribir la URL en cada tecla.
  const search = params.get('search') ?? ''
  const categoria = params.get('categoria') ?? ''
  const orden = params.get('orden') ?? 'recientes'
  const soloDisponibles = params.get('disponible') === 'true'
  const page = Math.max(1, Number(params.get('page')) || 1)

  const [texto, setTexto] = useState(search)
  const debouncedTexto = useDebounce(texto, 400)

  const [productos, setProductos] = useState([])
  const [meta, setMeta] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [seleccionado, setSeleccionado] = useState(null)

  /** Actualiza la URL conservando el resto de los filtros. */
  const setFiltro = useCallback((cambios) => {
    setParams((actuales) => {
      const siguiente = new URLSearchParams(actuales)
      for (const [clave, valor] of Object.entries(cambios)) {
        if (valor === '' || valor === null || valor === false) siguiente.delete(clave)
        else siguiente.set(clave, String(valor))
      }
      // Cualquier cambio de filtro devuelve a la primera página: quedarse en la
      // 4 tras filtrar suele dar un resultado vacío que parece un error.
      if (!('page' in cambios)) siguiente.delete('page')
      return siguiente
    }, { replace: true })
  }, [setParams])

  // El texto escrito se vuelca a la URL una vez que el visitante deja de teclear.
  useEffect(() => {
    if (debouncedTexto !== search) setFiltro({ search: debouncedTexto })
    // Solo reacciona al texto ya estabilizado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTexto])

  // Categorías para el filtro (solo las que tienen productos publicables).
  useEffect(() => {
    let active = true
    publicoService
      .listCategorias(true)
      .then((data) => { if (active) setCategorias(data) })
      .catch(() => { if (active) setCategorias([]) })
    return () => { active = false }
  }, [])

  // Listado.
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    const filtros = { page, limit: POR_PAGINA, orden }
    if (search) filtros.search = search
    if (categoria) filtros.categoriaId = categoria
    if (soloDisponibles) filtros.disponible = true

    publicoService
      .listProductos(filtros)
      .then(({ data, meta }) => {
        if (!active) return
        setProductos(data)
        setMeta(meta)
      })
      .catch((err) => {
        if (!active) return
        setProductos([])
        setError(err?.message || 'No pudimos cargar el catálogo')
      })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [page, search, categoria, orden, soloDisponibles])

  const hayFiltros = Boolean(search || categoria || soloDisponibles || orden !== 'recientes')

  const nombreCategoria = useMemo(
    () => categorias.find((c) => String(c.id) === String(categoria))?.nombre,
    [categorias, categoria]
  )

  function limpiar() {
    setTexto('')
    setParams(new URLSearchParams(), { replace: true })
  }

  return (
    <>
      {/* Encabezado de la sección */}
      <section className="border-b border-border bg-gradient-to-b from-accent/40 to-background">
        <div className="container-site py-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Catálogo</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground sm:text-4xl">
            {nombreCategoria || 'Todos los productos'}
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            {nombreCategoria
              ? 'Mira todo lo que tenemos en esta categoría.'
              : 'Vasos, platos, cubiertos, envases, bolsas y servilletas para tu negocio.'}
          </p>
        </div>
      </section>

      <div className="container-site py-8">
        {/* Filtros */}
        <Card className="mb-6 flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar por nombre o código..."
              aria-label="Buscar productos"
              className="pl-9"
            />
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2">
            <Select
              value={categoria}
              onChange={(e) => setFiltro({ categoria: e.target.value })}
              className="w-full sm:w-52"
              aria-label="Filtrar por categoría"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre} ({c.productos})</option>
              ))}
            </Select>

            <Select
              value={orden}
              onChange={(e) => setFiltro({ orden: e.target.value })}
              className="w-full sm:w-56"
              aria-label="Ordenar productos"
            >
              {ORDENES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>

            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input px-3">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[hsl(var(--primary))]"
                checked={soloDisponibles}
                onChange={(e) => setFiltro({ disponible: e.target.checked })}
              />
              <span className="whitespace-nowrap text-sm text-foreground">Solo con stock</span>
            </label>

            {hayFiltros && (
              <Button variant="ghost" size="sm" onClick={limpiar}>
                <X className="h-4 w-4" /> Limpiar
              </Button>
            )}
          </div>
        </Card>

        {/* Resultados */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: POR_PAGINA }).map((_, i) => <SkeletonProducto key={i} />)}
          </div>
        ) : error ? (
          <EmptyState
            icon={SlidersHorizontal}
            title="No pudimos cargar el catálogo"
            description={error}
            action={
              <Button variant="outline" onClick={() => setFiltro({ page: page })} className="mt-2">
                Reintentar
              </Button>
            }
          />
        ) : productos.length === 0 ? (
          <Card>
            <EmptyState
              icon={PackageSearch}
              title="No encontramos productos"
              description={
                hayFiltros
                  ? 'Prueba con otra búsqueda, cambia de categoría o quita algún filtro.'
                  : 'Todavía no hay productos publicados en el catálogo.'
              }
              action={
                hayFiltros ? (
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={limpiar}>Limpiar filtros</Button>
                    <Link to="/contacto">
                      <Button variant="ghost" className="w-full sm:w-auto">
                        Cuéntanos qué necesitas
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Link to="/contacto" className="mt-2">
                    <Button variant="outline">Cuéntanos qué necesitas</Button>
                  </Link>
                )
              }
            />
          </Card>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{meta?.total}</span>{' '}
                {meta?.total === 1 ? 'producto' : 'productos'}
                {nombreCategoria && ` en ${nombreCategoria}`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {productos.map((p) => (
                <ProductoCard key={p.id} producto={p} onSelect={setSeleccionado} />
              ))}
            </div>
            {meta && (
              <Pagination meta={meta} onPageChange={(p) => setFiltro({ page: p })} />
            )}
          </>
        )}
      </div>

      <ProductoDetalleModal
        producto={seleccionado}
        onClose={() => setSeleccionado(null)}
        config={config}
      />
    </>
  )
}
