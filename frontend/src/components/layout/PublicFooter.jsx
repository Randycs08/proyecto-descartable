/**
 * Pie del sitio público con los datos de contacto de la configuración.
 *
 * Cada dato es opcional en el schema, así que cada renglón se dibuja solo si
 * tiene contenido: un pie con etiquetas vacías se ve peor que uno más corto.
 */

import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react'
import { linkWhatsApp, linkTelefono, linkRed } from '@/services/publico.service.js'
import { Button } from '@/components/ui/Button.jsx'

/** Renglón de contacto con ícono; no se dibuja si no hay valor. */
function Dato({ icon: Icon, children, href }) {
  if (!children) return null
  const contenido = (
    <span className="flex items-start gap-2.5 text-sm text-brand-deep-foreground/70">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
      <span className="min-w-0">{children}</span>
    </span>
  )
  if (!href) return <li>{contenido}</li>
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded transition-colors hover:text-brand-deep-foreground"
      >
        {contenido}
      </a>
    </li>
  )
}

export function PublicFooter({ config }) {
  const nombre = config?.nombre_empresa || 'JAGN Solution'
  const whatsapp = linkWhatsApp(config?.whatsapp)
  const ubicacion = [config?.direccion, config?.ciudad, config?.provincia].filter(Boolean).join(', ')

  const redes = [
    ['Facebook', linkRed(config?.facebook, 'https://facebook.com')],
    ['Instagram', linkRed(config?.instagram, 'https://instagram.com')],
    ['X', linkRed(config?.twitter, 'https://x.com')],
    ['TikTok', linkRed(config?.tiktok, 'https://tiktok.com/@')],
  ].filter(([, url]) => Boolean(url))

  return (
    <footer className="mt-20 border-t border-border bg-brand-deep text-brand-deep-foreground">
      <div className="container-site grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <h3 className="text-lg font-bold">{nombre}</h3>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-brand-deep-foreground/70">
            Productos descartables para gastronomía, comercios y eventos.
            Mayorista y minorista.
          </p>
          <Link to="/catalogo" className="mt-5 inline-block">
            <Button size="sm">Ver catálogo</Button>
          </Link>
          {redes.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {redes.map(([label, url]) => (
                <li key={label}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-md border border-brand-deep-foreground/20 px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-brand-deep-foreground/50">
            Contacto
          </h3>
          <ul className="mt-4 space-y-3">
            <Dato icon={Mail} href={config?.email ? `mailto:${config.email}` : undefined}>
              {config?.email}
            </Dato>
            <Dato icon={Phone} href={linkTelefono(config?.telefono) || undefined}>
              {config?.telefono}
            </Dato>
            <Dato icon={MessageCircle} href={whatsapp || undefined}>
              {config?.whatsapp}
            </Dato>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-brand-deep-foreground/50">
            Dónde estamos
          </h3>
          <ul className="mt-4 space-y-3">
            <Dato icon={MapPin}>{ubicacion}</Dato>
            <Dato icon={Clock}>{config?.horario_atencion}</Dato>
          </ul>
        </div>
      </div>

      <div className="border-t border-brand-deep-foreground/10">
        <div className="container-site flex flex-col items-center justify-between gap-3 py-5 text-sm text-brand-deep-foreground/50 sm:flex-row">
          <span>© {new Date().getFullYear()} {nombre}. Todos los derechos reservados.</span>
          <div className="flex gap-5">
            <Link to="/catalogo" className="rounded transition-colors hover:text-brand-deep-foreground">
              Catálogo
            </Link>
            <Link to="/contacto" className="rounded transition-colors hover:text-brand-deep-foreground">
              Contacto
            </Link>
            <Link to="/login" className="rounded transition-colors hover:text-brand-deep-foreground">
              Ingresar
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
