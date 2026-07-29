/**
 * Encabezado del sitio público: identidad de la empresa, navegación y contacto
 * directo por WhatsApp.
 *
 * Todo lo que muestra sale de la configuración real. Como esos campos son
 * opcionales, cada bloque se dibuja solo si hay dato: sin logo se cae al ícono,
 * sin nombre al genérico y sin WhatsApp el botón no aparece en lugar de quedar
 * un enlace roto.
 */

import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Package2, MessageCircle, Menu, X, ShoppingCart } from 'lucide-react'
import { linkWhatsApp } from '@/services/publico.service.js'
import { useCarrito } from '@/hooks/useCarrito.js'
import { resolveImageUrl, cn } from '@/lib/utils.js'
import { Button } from '@/components/ui/Button.jsx'

const NAV = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/contacto', label: 'Contacto' },
]

export function PublicHeader({ config }) {
  const [abierto, setAbierto] = useState(false)
  const { unidades, abrir } = useCarrito()

  const nombre = config?.nombre_empresa || 'JAGN Solution'
  const logo = resolveImageUrl(config?.logo_url)
  const whatsapp = linkWhatsApp(config?.whatsapp)

  // El estado activo se marca con fondo además de color: solo con color, la
  // diferencia entre "Inicio" y "Catálogo" pasa desapercibida de reojo.
  const enlaceClase = ({ isActive }) =>
    cn(
      'rounded-md px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'bg-accent text-accent-foreground'
        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
    )

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/85 shadow-soft backdrop-blur-md">
      <div className="container-site flex h-16 items-center justify-between gap-4 lg:h-18">
        {/* Logo: si el negocio cargó uno se muestra en un recuadro blanco con
            `object-contain`, que respeta su proporción; sin logo, la inicial de
            la empresa sobre el color de marca, que se ve intencional. */}
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2.5 rounded-md"
          aria-label={`${nombre} — ir al inicio`}
        >
          {logo ? (
            <img
              src={logo}
              alt={nombre}
              className="h-10 w-10 flex-shrink-0 rounded-lg border border-border bg-white object-contain p-1"
            />
          ) : (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
              <Package2 className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 leading-tight">
            <span className="block truncate text-base font-bold text-foreground sm:text-lg">
              {nombre}
            </span>
            <span className="hidden text-[11px] font-medium uppercase tracking-widest text-muted-foreground sm:block">
              Descartables
            </span>
          </div>
        </Link>

        {/* Navegación de escritorio */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={enlaceClase}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Carrito: siempre visible, con la cantidad de unidades cargadas. */}
          <Button
            variant="ghost"
            size="icon"
            onClick={abrir}
            aria-label={unidades > 0 ? `Abrir carrito (${unidades} unidades)` : 'Abrir carrito'}
            className="relative"
          >
            <ShoppingCart className="h-5 w-5" />
            {unidades > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-accent px-1 text-[11px] font-bold text-brand-accent-foreground ring-2 ring-card">
                {unidades > 99 ? '99+' : unidades}
              </span>
            )}
          </Button>

          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="hidden sm:block">
              <Button size="sm">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </Button>
            </a>
          )}
          <Link to="/login" className="hidden md:block">
            <Button size="sm" variant="ghost">Ingresar</Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setAbierto((v) => !v)}
            aria-label="Abrir menú"
            aria-expanded={abierto}
          >
            {abierto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Navegación móvil */}
      {abierto && (
        <nav className="border-t border-border bg-card md:hidden">
          <div className="container flex flex-col py-2">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setAbierto(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/60'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md px-3 py-3 text-sm font-medium text-muted-foreground sm:hidden"
              >
                WhatsApp
              </a>
            )}
            <Link
              to="/login"
              onClick={() => setAbierto(false)}
              className="rounded-md px-3 py-3 text-sm font-medium text-muted-foreground"
            >
              Ingresar
            </Link>
          </div>
        </nav>
      )}
    </header>
  )
}
