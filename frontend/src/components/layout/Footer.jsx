/**
 * Pie de página del panel.
 */

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-border bg-card px-6 py-4">
      <div className="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
        <p>© {year} JAGN Solution — Todos los derechos reservados.</p>
        <p>Hecho con React + Vite + Tailwind CSS</p>
      </div>
    </footer>
  )
}
