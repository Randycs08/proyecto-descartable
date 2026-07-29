/**
 * Barra lateral de navegación del panel.
 *
 *  - En escritorio: fija a la izquierda.
 *  - En móvil: se muestra como panel deslizante sobre un overlay (controlado
 *    por `open`/`onClose` desde AdminLayout).
 *  - Marca la ruta activa con NavLink y atenúa los módulos "no listos".
 */

import { NavLink } from 'react-router-dom'
import { Package2, X } from 'lucide-react'
import { cn } from '@/lib/utils.js'
import { navItems } from '@/constants/navigation.js'
import { Badge } from '@/components/ui/Badge.jsx'

export function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Overlay en móvil */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground',
          'transition-transform duration-200 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Marca */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent">
              <Package2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold">JAGN Solution</span>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-white/10 lg:hidden" aria-label="Cerrar menú">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-3 pb-2 pt-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Principal
          </p>
          {navItems.map((item) => {
            const Icon = item.icon
            // Los módulos no listos no navegan; se muestran deshabilitados.
            if (!item.ready) {
              return (
                <div
                  key={item.to}
                  className="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-2 text-sm text-sidebar-foreground/40"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </span>
                  <Badge variant="secondary" className="bg-white/10 text-[10px] text-white/60">
                    Pronto
                  </Badge>
                </div>
              )
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-white'
                      : 'text-sidebar-foreground/80 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4 text-xs text-sidebar-foreground/50">
          v0.1.0 · Panel administrativo
        </div>
      </aside>
    </>
  )
}
