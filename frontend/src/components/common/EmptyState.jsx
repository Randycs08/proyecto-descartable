/**
 * Estado vacío para listas sin resultados. Acepta un ícono y una acción.
 */

import { Inbox } from 'lucide-react'

export function EmptyState({ icon: Icon = Inbox, title = 'Sin resultados', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}
