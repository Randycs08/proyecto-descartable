/**
 * Tarjeta de métrica del Dashboard: ícono, título, valor y (opcionalmente) la
 * variación respecto del período anterior.
 *
 * `trend` admite tres estados y los tres significan cosas distintas:
 *   número  -> variación porcentual; se pinta en verde si sube y en rojo si baja
 *   null    -> el período anterior fue 0, así que NO hay base de comparación
 *   undefined -> la métrica no se compara (p. ej. el stock, que es una foto del
 *                momento y no un flujo del período)
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card.jsx'

const TONES = {
  primary: 'bg-primary/10 text-primary',
  amber: 'bg-amber-100 text-amber-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  red: 'bg-destructive/10 text-destructive',
  slate: 'bg-muted text-muted-foreground',
}

/** Variación porcentual con su flecha. */
function Trend({ value }) {
  if (value === null) {
    return <span className="text-xs text-muted-foreground">sin período previo</span>
  }

  const sinCambio = value === 0
  const sube = value > 0
  const Icon = sinCambio ? Minus : sube ? TrendingUp : TrendingDown
  const color = sinCambio ? 'text-muted-foreground' : sube ? 'text-emerald-600' : 'text-destructive'

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      {sube ? '+' : ''}{value}%
      <span className="font-normal text-muted-foreground">vs. período anterior</span>
    </span>
  )
}

export function StatCard({ title, value, icon: Icon, hint, tone = 'primary', trend }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-6">
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="truncate text-2xl font-bold text-foreground">{value}</p>
          {trend !== undefined ? (
            <div className="mt-1"><Trend value={trend} /></div>
          ) : (
            hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
