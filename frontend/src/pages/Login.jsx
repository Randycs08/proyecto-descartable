/**
 * Pantalla de inicio de sesión conectada a la API (POST /auth/login vía el
 * AuthContext). Al autenticar, redirige a la ruta de origen o al dashboard.
 *
 * Es el acceso del PERSONAL, no de los clientes: quien compra no necesita cuenta
 * (el checkout público no pide registro). Por eso la pantalla se identifica como
 * "Acceso del personal" y ofrece una salida clara al sitio, para que nadie que
 * llegue por error se quede encerrado sin saber cómo volver.
 */

import { useState } from 'react'
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom'
import { Package2, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth.js'
import { notify } from '@/lib/toast.js'
import { Button } from '@/components/ui/Button.jsx'
import { Input } from '@/components/ui/Input.jsx'
import { FormField } from '@/components/common/FormField.jsx'
import { FullPageSpinner } from '@/components/ui/Spinner.jsx'

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // A dónde volver tras loguear (o dashboard por defecto).
  const from = location.state?.from?.pathname || '/admin'

  // Si ya hay sesión, no mostramos el login.
  if (loading) return <FullPageSpinner />
  if (isAuthenticated) return <Navigate to={from} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(form.email, form.password)
      notify.success('¡Bienvenido!')
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión')
      notify.fromApiError(err, 'No se pudo iniciar sesión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <div className="w-full max-w-md">
        {/* Salida al sitio público. Va arriba de todo y con <Link>, así navega
            sin recargar la aplicación y es lo primero que alcanza el teclado. */}
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        {/* Marca */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
            <Package2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">JAGN Solution</h1>
            <p className="text-sm text-muted-foreground">Acceso del personal</p>
          </div>
        </div>

        {/* Tarjeta de login */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h2 className="mb-1 text-lg font-semibold text-foreground">Iniciar sesión</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Ingresa las credenciales de tu cuenta para entrar al panel de
            administración.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <FormField label="Email" htmlFor="email" required>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="correo@empresa.com"
                  className="pl-9"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
            </FormField>

            <FormField label="Contraseña" htmlFor="password" required>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>

            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" loading={submitting}>
              Ingresar
            </Button>
          </form>

          {/* Credenciales de demo (solo desarrollo) */}
          <div className="mt-6 rounded-md border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Credenciales de prueba</p>
            <p>admin@descartables.com · Admin123*</p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          ¿Buscas comprar?{' '}
          <Link to="/catalogo" className="font-medium text-primary hover:underline">
            Mira nuestro catálogo
          </Link>
          <br />
          <span className="mt-2 block">
            © {new Date().getFullYear()} JAGN Solution
          </span>
        </p>
      </div>
    </div>
  )
}
