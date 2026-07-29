/**
 * Portada del sitio público.
 *
 * Estructura, en el orden en que se decide una compra: qué vendemos (hero), por
 * dónde empezar a mirar (categorías), qué ofrecemos hoy (destacados), por qué
 * comprarnos (beneficios) y cómo contactarnos (cierre).
 *
 * Sobre el contenido: los textos son genéricos del rubro y las cifras de la
 * franja de confianza salen del CATÁLOGO REAL (cantidad de productos y de
 * categorías). No hay descuentos, porcentajes ni "clientes satisfechos"
 * inventados: el backend no tiene esos datos y ponerlos sería mentir.
 *
 * Las secciones que dependen del catálogo se ocultan si vienen vacías, en vez de
 * mostrar un título con un hueco debajo.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, ShoppingBag, Truck, BadgeCheck, Wallet, Headphones,
  Package2, AlertCircle, MessageCircle, Clock, Sparkles,
} from 'lucide-react'
import { publicoService, linkWhatsApp } from '@/services/publico.service.js'
import { useConfiguracionPublica } from '@/components/layout/PublicLayout.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Card, CardContent } from '@/components/ui/Card.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Skeleton } from '@/components/ui/Skeleton.jsx'
import { ProductoCard } from '@/components/publico/ProductoCard.jsx'
import { ProductoDetalleModal } from '@/components/publico/ProductoDetalleModal.jsx'
import { ImagenProducto } from '@/components/publico/ImagenProducto.jsx'

const BENEFICIOS = [
  { icon: Truck, titulo: 'Entrega coordinada', texto: 'Acordamos día y horario según tu zona.' },
  { icon: Wallet, titulo: 'Precios mayoristas', texto: 'Mejor precio por volumen para tu negocio.' },
  { icon: BadgeCheck, titulo: 'Calidad garantizada', texto: 'Trabajamos con marcas reconocidas del rubro.' },
  { icon: Headphones, titulo: 'Atención personalizada', texto: 'Te asesoramos para elegir lo que necesitas.' },
]

/** Encabezado de sección, para que todas tengan el mismo ritmo. */
function TituloSeccion({ eyebrow, titulo, texto, enlace, enlaceTexto }) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{titulo}</h2>
        {texto && <p className="mt-1 text-muted-foreground">{texto}</p>}
      </div>
      {enlace && (
        <Link
          to={enlace}
          className="group inline-flex flex-shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          {enlaceTexto}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  )
}

export default function Home() {
  const config = useConfiguracionPublica()

  const [destacados, setDestacados] = useState([])
  const [categorias, setCategorias] = useState([])
  const [totalProductos, setTotalProductos] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [seleccionado, setSeleccionado] = useState(null)

  useEffect(() => {
    let active = true
    Promise.all([
      publicoService.listProductos({ destacado: true, disponible: true, limit: 8 }),
      publicoService.listCategorias(true),
      publicoService.listProductos({ limit: 1 }),
    ])
      .then(([prod, cats, todos]) => {
        if (!active) return
        setDestacados(prod.data)
        setCategorias(cats.slice(0, 6))
        setTotalProductos(todos.meta?.total ?? null)
      })
      .catch((err) => {
        if (active) setError(err?.message || 'No pudimos cargar el catálogo')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const nombre = config?.nombre_empresa || 'nuestra tienda'
  const whatsapp = linkWhatsApp(config?.whatsapp)

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden border-b border-border bg-brand-deep text-brand-deep-foreground">
        {/* Trama geométrica sutil: da profundidad al bloque sin necesitar una
            fotografía de fondo, que hoy no existe. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl"
        />

        <div className="container-site relative grid gap-10 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <Badge variant="brand" className="gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5" /> Mayorista y minorista
            </Badge>

            <h1 className="mt-5 text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">
              Descartables para tu negocio,{' '}
              <span className="text-primary">al mejor precio</span>
            </h1>

            <p className="mt-5 max-w-xl text-lg text-brand-deep-foreground/70">
              Vasos, platos, cubiertos, envases, bolsas y servilletas. Arma tu
              pedido en línea y coordinamos la entrega por WhatsApp.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/catalogo">
                <Button size="xl" className="w-full sm:w-auto">
                  Ver catálogo <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                  <Button
                    size="xl"
                    variant="outline"
                    className="w-full border-brand-deep-foreground/25 bg-transparent text-brand-deep-foreground hover:bg-brand-deep-foreground/10 hover:text-brand-deep-foreground sm:w-auto"
                  >
                    <MessageCircle className="h-4 w-4" /> Pedir por WhatsApp
                  </Button>
                </a>
              )}
            </div>

            {config?.horario_atencion && (
              <p className="mt-6 flex items-center gap-2 text-sm text-brand-deep-foreground/60">
                <Clock className="h-4 w-4 flex-shrink-0" /> {config.horario_atencion}
              </p>
            )}
          </div>

          {/* Vista previa del catálogo: en vez de una ilustración inventada, se
              muestran productos reales. Si todavía no hay, no se dibuja nada. */}
          <div className="hidden lg:block">
            {loading ? (
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square w-full rounded-lg bg-white/10" />
                ))}
              </div>
            ) : destacados.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {destacados.slice(0, 4).map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSeleccionado(p)}
                    aria-label={`Ver ${p.nombre}`}
                    className={`overflow-hidden rounded-xl shadow-elevada transition-transform hover:scale-[1.03] ${
                      i % 2 === 1 ? 'translate-y-6' : ''
                    }`}
                  >
                    <ImagenProducto
                      src={p.imagen_url}
                      nombre={p.nombre}
                      categoria={p.categoria_nombre}
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Franja de confianza */}
      {/* Las cifras salen del catálogo real; si no hay datos, no se muestran. */}
      <section className="border-b border-border bg-card">
        <div className="container-site grid grid-cols-2 divide-x divide-border sm:grid-cols-4">
          {[
            [totalProductos, 'productos en catálogo'],
            [categorias.length || null, 'categorías'],
            [null, 'Entrega coordinada'],
            [null, 'Atención personalizada'],
          ].map(([valor, texto], i) => (
            <div key={texto} className={`px-4 py-6 text-center ${i > 1 ? 'hidden sm:block' : ''}`}>
              {valor !== null && (
                <p className="text-2xl font-bold text-foreground">{valor}+</p>
              )}
              <p className="text-xs text-muted-foreground sm:text-sm">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- Categorías */}
      {(loading || categorias.length > 0) && (
        <section className="container-site py-16">
          <TituloSeccion
            eyebrow="Explorá"
            titulo="Categorías"
            texto="Encontrá lo que buscás más rápido"
            enlace="/catalogo"
            enlaceTexto="Ver todo"
          />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square w-full rounded-lg" />
                ))
              : categorias.map((c) => (
                  <Link key={c.id} to={`/catalogo?categoria=${c.id}`} className="group">
                    <Card className="overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card">
                      <ImagenProducto
                        src={c.imagen_url}
                        nombre={c.nombre}
                        categoria={c.nombre}
                        zoom
                      />
                      <CardContent className="p-3 text-center">
                        <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                          {c.nombre}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {c.productos} {c.productos === 1 ? 'producto' : 'productos'}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
          </div>
        </section>
      )}

      {/* --------------------------------------------------------- Destacados */}
      <section className="border-y border-border bg-muted/40 py-16">
        <div className="container-site">
          <TituloSeccion
            eyebrow="Selección"
            titulo="Productos destacados"
            texto="Lo que más nos piden"
            enlace="/catalogo"
            enlaceTexto="Ver catálogo completo"
          />

          {loading ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-square w-full rounded-none" />
                  <CardContent className="space-y-2 p-4">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-6 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card className="flex flex-col items-center gap-3 py-14 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Link to="/catalogo">
                <Button variant="outline">Ir al catálogo</Button>
              </Link>
            </Card>
          ) : destacados.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 py-14 text-center">
              <Package2 className="h-8 w-8 text-muted-foreground" />
              <p className="max-w-sm text-sm text-muted-foreground">
                Estamos preparando nuestra selección. Mientras tanto, revisa el
                catálogo completo.
              </p>
              <Link to="/catalogo">
                <Button variant="outline">Ver catálogo</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {destacados.map((p) => (
                <ProductoCard key={p.id} producto={p} onSelect={setSeleccionado} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* -------------------------------------------------------- Beneficios */}
      <section className="container-site py-16">
        <TituloSeccion
          eyebrow="Por qué elegirnos"
          titulo="Trabajamos para que no te falte nada"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFICIOS.map(({ icon: Icon, titulo, texto }) => (
            <Card
              key={titulo}
              className="p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-foreground">{titulo}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{texto}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* --------------------------------------------- Llamada a la acción */}
      <section className="border-t border-border bg-brand-deep text-brand-deep-foreground">
        <div className="container-site flex flex-col items-center gap-5 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="max-w-2xl text-2xl font-bold sm:text-3xl">
            ¿Necesitas un presupuesto para tu negocio?
          </h2>
          <p className="max-w-lg text-brand-deep-foreground/70">
            Cuéntanos qué necesitas y preparamos una propuesta a medida con
            precios mayoristas.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="w-full sm:w-auto">
                  <MessageCircle className="h-4 w-4" /> Escríbenos por WhatsApp
                </Button>
              </a>
            )}
            <Link to="/contacto">
              <Button
                size="lg"
                variant="outline"
                className="w-full border-brand-deep-foreground/25 bg-transparent text-brand-deep-foreground hover:bg-brand-deep-foreground/10 hover:text-brand-deep-foreground sm:w-auto"
              >
                Formulario de contacto
              </Button>
            </Link>
          </div>
          <p className="text-xs text-brand-deep-foreground/50">
            Atención comercial de {nombre}
          </p>
        </div>
      </section>

      <ProductoDetalleModal
        producto={seleccionado}
        onClose={() => setSeleccionado(null)}
        config={config}
      />
    </>
  )
}
