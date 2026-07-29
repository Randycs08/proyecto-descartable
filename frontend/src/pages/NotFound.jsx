/**
 * Página 404 genérica.
 */

import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button.jsx'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4 text-center">
      <p className="text-7xl font-black text-primary">404</p>
      <h1 className="text-xl font-semibold text-foreground">Página no encontrada</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        La página que buscás no existe o fue movida.
      </p>
      <div className="flex gap-2">
        <Link to="/">
          <Button variant="outline">Ir al inicio</Button>
        </Link>
        <Link to="/admin">
          <Button>Ir al panel</Button>
        </Link>
      </div>
    </div>
  )
}
