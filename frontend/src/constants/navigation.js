/**
 * Definición centralizada de los ítems del menú del panel. Cada ítem indica su
 * ruta, etiqueta, ícono y si el módulo ya está disponible (`ready`). Los
 * módulos no disponibles se muestran atenuados con una insignia "Pronto".
 */

import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  Mail,
} from 'lucide-react'

export const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, ready: true, end: true },
  { to: '/admin/productos', label: 'Productos', icon: Package, ready: true },
  { to: '/admin/categorias', label: 'Categorías', icon: Tags, ready: true },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingCart, ready: true },
  { to: '/admin/clientes', label: 'Clientes', icon: Users, ready: true },
  { to: '/admin/contactos', label: 'Mensajes', icon: Mail, ready: true },
  { to: '/admin/estadisticas', label: 'Estadísticas', icon: BarChart3, ready: false },
  { to: '/admin/configuracion', label: 'Configuración', icon: Settings, ready: true },
]
