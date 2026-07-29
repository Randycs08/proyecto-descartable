/**
 * Página placeholder para los módulos aún no implementados (pedidos, clientes,
 * estadísticas, configuración). Ya están enrutados y accesibles, pero informan
 * que el backend correspondiente está en desarrollo.
 */

import { Construction } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { Card, CardContent } from '@/components/ui/Card.jsx'

export function ComingSoon({ title, description }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Construction className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Módulo en desarrollo</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Esta sección se habilitará cuando el módulo correspondiente esté disponible en el
            backend. La estructura ya está preparada para conectarla.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
