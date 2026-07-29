/**
 * Envuelve un control de formulario con su etiqueta y (opcional) mensaje de
 * error, para no repetir ese markup en cada campo.
 */

import { Label } from '@/components/ui/Label.jsx'

export function FormField({ label, htmlFor, required, error, hint, children }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  )
}
