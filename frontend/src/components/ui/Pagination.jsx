/**
 * Controles de paginación. Recibe el objeto `meta` que devuelve la API
 * ({ page, totalPages, total, hasNextPage, hasPrevPage }) y notifica cambios
 * de página vía onPageChange.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button.jsx'

export function Pagination({ meta, onPageChange }) {
  if (!meta || meta.totalPages <= 1) {
    // Con una sola página igual mostramos el total, sin controles.
    return (
      <div className="flex items-center justify-between px-1 py-2 text-sm text-muted-foreground">
        <span>{meta?.total ?? 0} registro(s)</span>
      </div>
    )
  }

  const { page, totalPages, total } = meta

  return (
    <div className="flex flex-col items-center justify-between gap-3 px-1 py-2 sm:flex-row">
      <span className="text-sm text-muted-foreground">
        Página <strong className="text-foreground">{page}</strong> de {totalPages} · {total} registro(s)
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={!meta.hasPrevPage}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!meta.hasNextPage}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
