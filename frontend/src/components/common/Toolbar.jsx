/**
 * Barra superior de las tablas: campo de búsqueda + espacio para filtros extra
 * (children). Es controlada: recibe `search` y `onSearchChange`.
 */

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/Input.jsx'

export function Toolbar({ search, onSearchChange, placeholder = 'Buscar...', children }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
