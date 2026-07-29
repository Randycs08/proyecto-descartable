/**
 * Etiqueta de formulario. Marca los campos obligatorios con un asterisco.
 */

import { cn } from '@/lib/utils.js'

export function Label({ className, required, children, ...props }) {
  return (
    <label
      className={cn('text-sm font-medium leading-none text-foreground', className)}
      {...props}
    >
      {children}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </label>
  )
}
