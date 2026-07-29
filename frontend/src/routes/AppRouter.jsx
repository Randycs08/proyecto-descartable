/**
 * Definición de todas las rutas de la aplicación.
 *
 *  - Públicas:   "/" (landing) y "/login".
 *  - Privadas:   "/admin/*" protegidas por <ProtectedRoute> y envueltas en
 *                <AdminLayout> (Sidebar + Navbar + Footer).
 *  - 404:        cualquier otra ruta.
 */

import { Routes, Route } from 'react-router-dom'

import Home from '@/pages/public/Home.jsx'
import Catalogo from '@/pages/public/Catalogo.jsx'
import Checkout from '@/pages/public/Checkout.jsx'
import PedidoConfirmado from '@/pages/public/PedidoConfirmado.jsx'
import Contacto from '@/pages/public/Contacto.jsx'
import { PublicLayout } from '@/components/layout/PublicLayout.jsx'
import Login from '@/pages/Login.jsx'
import NotFound from '@/pages/NotFound.jsx'

import { ProtectedRoute } from './ProtectedRoute.jsx'
import { AdminLayout } from '@/components/layout/AdminLayout.jsx'
import Dashboard from '@/pages/admin/Dashboard.jsx'
import Categorias from '@/pages/admin/Categorias.jsx'
import Productos from '@/pages/admin/Productos.jsx'
import Clientes from '@/pages/admin/Clientes.jsx'
import Pedidos from '@/pages/admin/Pedidos.jsx'
import Configuracion from '@/pages/admin/Configuracion.jsx'
import Contactos from '@/pages/admin/Contactos.jsx'
import { ComingSoon } from '@/pages/admin/ComingSoon.jsx'

export function AppRouter() {
  return (
    <Routes>
      {/* Público (sitio de visitantes: header + footer comunes) */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/pedido-confirmado" element={<PedidoConfirmado />} />
        <Route path="/contacto" element={<Contacto />} />
      </Route>

      <Route path="/login" element={<Login />} />

      {/* Privado (JWT) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="productos" element={<Productos />} />
          <Route path="categorias" element={<Categorias />} />
          <Route path="pedidos" element={<Pedidos />} />
          <Route path="clientes" element={<Clientes />} />
          <Route
            path="estadisticas"
            element={<ComingSoon title="Estadísticas" description="Reportes y métricas." />}
          />
          <Route path="contactos" element={<Contactos />} />
          <Route path="configuracion" element={<Configuracion />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
