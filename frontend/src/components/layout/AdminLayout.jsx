/**
 * Estructura del panel: Sidebar + (Navbar, contenido con <Outlet/>, Footer).
 * Gestiona el estado de apertura del sidebar en móvil.
 *
 * Se usa como elemento contenedor de las rutas /admin/* (rutas anidadas de
 * React Router mediante <Outlet/>).
 */

import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { publicoService } from '@/services/publico.service.js'
import { setMoneda } from '@/lib/utils.js'
import { Sidebar } from './Sidebar.jsx'
import { Navbar } from './Navbar.jsx'
import { Footer } from './Footer.jsx'

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Solo sirve para volver a dibujar cuando llega la moneda: `setMoneda` guarda
  // en un módulo, y sin este cambio de estado lo que ya se pintó se quedaría con
  // la moneda por defecto hasta la siguiente navegación.
  const [, setMonedaLista] = useState(false)

  // Moneda del panel, tomada de la configuración de la empresa.
  //
  // Se lee del endpoint PÚBLICO y no de `/api/configuracion` a propósito: aquel
  // está reservado a Administrador y Empleado, así que a un Vendedor le
  // respondería 403 y vería los importes en la moneda equivocada. El público
  // devuelve `moneda` y lo puede consultar cualquiera con sesión iniciada.
  useEffect(() => {
    publicoService
      .getConfiguracion()
      .then((config) => {
        setMoneda(config?.moneda)
        setMonedaLista(true)
      })
      .catch(() => { /* se mantiene la moneda por defecto */ })
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Contenido: desplazado a la derecha del sidebar en escritorio (lg:pl-64) */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}
