/**
 * Indicador de carga giratorio. `FullPageSpinner` centra el spinner en toda la
 * pantalla (se usa mientras se verifica la sesión inicial).
 */

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils.js'

export function Spinner({ className }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-primary', className)} />
}

export function FullPageSpinner({ label = 'Cargando...' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <Spinner className="h-8 w-8" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
