/**
 * Placeholder animado que se muestra mientras cargan los datos.
 * `SkeletonTable` arma un esqueleto de filas para las tablas.
 */

import { cn } from '@/lib/utils.js'

export function Skeleton({ className, ...props }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
}

/** Esqueleto para una tabla: N filas x M columnas. */
export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn('h-8 flex-1', c === 0 && 'max-w-[48px]')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Esqueleto para tarjetas de estadísticas del dashboard. */
export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-8 w-16" />
      <Skeleton className="mt-3 h-3 w-32" />
    </div>
  )
}
