/**
 * Estructura común del sitio público: encabezado, contenido y pie.
 *
 * La configuración de la empresa se pide UNA sola vez acá y se reparte:
 * el encabezado y el pie la reciben por props, y las páginas hijas la leen con
 * `useOutletContext()`. Si cada página la pidiera por su cuenta, cambiar de
 * sección volvería a golpear la API por los mismos datos.
 *
 * Si la configuración falla no se corta el sitio: el catálogo es lo importante y
 * los datos de contacto son accesorios, así que el layout sigue dibujándose con
 * los valores por defecto del encabezado y el pie.
 */

import { useEffect, useState } from 'react'
import { Outlet, useOutletContext } from 'react-router-dom'
import { publicoService } from '@/services/publico.service.js'
import { setMoneda } from '@/lib/utils.js'
import { CarritoProvider } from '@/context/CarritoContext.jsx'
import { CarritoPanel } from '@/components/publico/CarritoPanel.jsx'
import { PublicHeader } from './PublicHeader.jsx'
import { PublicFooter } from './PublicFooter.jsx'

export function PublicLayout() {
  const [config, setConfig] = useState(null)

  useEffect(() => {
    let active = true
    publicoService
      .getConfiguracion()
      .then((data) => {
        if (!active) return
        // Antes de dibujar los precios: si no, el primer render los muestra en
        // la moneda por defecto y cambian a la vista.
        setMoneda(data?.moneda)
        setConfig(data)
      })
      .catch(() => { /* el sitio funciona igual sin los datos de contacto */ })
    return () => { active = false }
  }, [])

  // El carrito solo envuelve al sitio público: el panel no tiene nada que hacer
  // dentro del área de administración.
  return (
    <CarritoProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <PublicHeader config={config} />
        <main className="flex-1">
          <Outlet context={{ config }} />
        </main>
        <PublicFooter config={config} />
        <CarritoPanel />
      </div>
    </CarritoProvider>
  )
}

/** Acceso a la configuración de la empresa desde cualquier página pública. */
// eslint-disable-next-line react-refresh/only-export-components
export function useConfiguracionPublica() {
  return useOutletContext()?.config ?? null
}
