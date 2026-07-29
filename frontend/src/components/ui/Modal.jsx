/**
 * Modal/diálogo accesible construido con un portal.
 *
 * Características:
 *  - Se renderiza en document.body (createPortal) para evitar problemas de
 *    overflow/stacking.
 *  - Cierra con la tecla Escape y al hacer clic en el overlay.
 *  - Bloquea el scroll del body mientras está abierto.
 *  - Animaciones de entrada (fade + zoom) definidas en tailwind.config.js.
 */

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils.js'

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  // Cierre con Escape + bloqueo de scroll mientras está abierto.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Contenido */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 w-full rounded-lg border border-border bg-card shadow-xl animate-zoom-in',
          'max-h-[90vh] overflow-y-auto',
          sizes[size]
        )}
      >
        <div className="flex items-start justify-between border-b border-border p-5">
          <div>
            {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">{children}</div>

        {footer && <div className="flex justify-end gap-2 border-t border-border p-5">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
