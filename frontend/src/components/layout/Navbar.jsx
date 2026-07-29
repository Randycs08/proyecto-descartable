/**
 * Barra superior del panel: botón para abrir el menú en móvil, título de la
 * sección y menú de usuario (perfil + cerrar sesión).
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, LogOut, User as UserIcon, ChevronDown } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth.js'
import { notify } from '@/lib/toast.js'

export function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Cierra el menú de usuario al hacer clic afuera.
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function handleLogout() {
    await logout()
    notify.success('Sesión cerrada')
    navigate('/login')
  }

  const iniciales = (user?.nombre?.[0] || 'U').toUpperCase()

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur lg:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-muted-foreground hover:bg-accent lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden lg:block">
        <p className="text-sm text-muted-foreground">Panel de administración</p>
      </div>

      {/* Menú de usuario */}
      <div className="relative ml-auto" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md p-1.5 pr-2 hover:bg-accent"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {iniciales}
          </span>
          <span className="hidden text-sm font-medium text-foreground sm:block">
            {user?.nombre} {user?.apellido}
          </span>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-md border border-border bg-card shadow-lg animate-fade-in">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-medium text-foreground">
                {user?.nombre} {user?.apellido}
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <p className="mt-1 text-xs font-medium text-primary">{user?.rol}</p>
            </div>
            <div className="p-1">
              <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-foreground hover:bg-accent">
                <UserIcon className="h-4 w-4" /> Mi perfil
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" /> Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
