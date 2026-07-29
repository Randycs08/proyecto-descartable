/**
 * Datos de la empresa: identidad, contacto, ubicación y redes sociales.
 *
 * No es un CRUD: la configuración es una sola fila, así que la pantalla es un
 * formulario que se carga al entrar y se guarda entero. No hay tabla, ni alta,
 * ni borrado.
 *
 * Permisos: consultar es para Administrador y Empleado; modificar, solo para
 * Administrador. El resto ve el formulario deshabilitado y sin botón de guardar.
 * Esa comprobación es únicamente de interfaz — quien manda es el backend, que
 * responde 403 igual (ver routes/configuracion.routes.js).
 */

import { useEffect, useState } from 'react'
import { Save, Building2, Lock, ImageOff } from 'lucide-react'
import { configuracionService } from '@/services/configuracion.service.js'
import { useAuth } from '@/hooks/useAuth.js'
import { notify } from '@/lib/toast.js'
import { resolveImageUrl, MONEDAS } from '@/lib/utils.js'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { FormField } from '@/components/common/FormField.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { Card, CardContent } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Input } from '@/components/ui/Input.jsx'
import { Select } from '@/components/ui/Select.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Skeleton } from '@/components/ui/Skeleton.jsx'

/** Campos de texto del formulario, en el mismo orden que el schema. */
const CAMPOS = [
  'nombre_empresa', 'moneda', 'email', 'telefono', 'whatsapp',
  'direccion', 'ciudad', 'provincia', 'horario_atencion',
  'facebook', 'instagram', 'twitter', 'tiktok',
]

const VACIO = Object.fromEntries(CAMPOS.map((c) => [c, '']))

/** Bloque con título para agrupar campos relacionados. */
function Seccion({ title, description, children }) {
  return (
    <Card>
      <div className="border-b border-border p-5">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <CardContent className="space-y-4 p-5">{children}</CardContent>
    </Card>
  )
}

export default function Configuracion() {
  const { user } = useAuth()
  const puedeEditar = user?.rol === 'Administrador'

  const [form, setForm] = useState(VACIO)
  const [logoActual, setLogoActual] = useState(null)
  const [logo, setLogo] = useState(null)          // File nuevo, si se eligió uno
  const [logoPreview, setLogoPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [sinPermiso, setSinPermiso] = useState(false)

  // Carga inicial.
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const config = await configuracionService.get()
        if (!active) return
        setForm(Object.fromEntries(CAMPOS.map((c) => [c, config[c] ?? ''])))
        setLogoActual(config.logo_url)
      } catch (err) {
        if (!active) return
        // El 403 no es un fallo: es un rol sin acceso al módulo.
        if (err?.status === 403) setSinPermiso(true)
        else notify.fromApiError(err, 'No se pudo cargar la configuración')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  // Vista previa del logo nuevo. El objeto URL se libera al cambiar de archivo:
  // si no, cada selección deja un blob retenido en memoria.
  useEffect(() => {
    if (!logo) { setLogoPreview(null); return }
    const url = URL.createObjectURL(logo)
    setLogoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [logo])

  const set = (clave, valor) => setForm((f) => ({ ...f, [clave]: valor }))

  function validate() {
    const e = {}
    if (!form.nombre_empresa.trim()) e.nombre_empresa = 'El nombre de la empresa es obligatorio'
    if (!form.moneda.trim()) e.moneda = 'La moneda es obligatoria'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'El email no es válido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const payload = { ...form }
      if (logo) payload.logo = logo

      const config = await configuracionService.update(payload)
      setForm(Object.fromEntries(CAMPOS.map((c) => [c, config[c] ?? ''])))
      setLogoActual(config.logo_url)
      setLogo(null)
      notify.success('Configuración guardada')
    } catch (err) {
      notify.fromApiError(err, 'No se pudo guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  if (sinPermiso) {
    return (
      <div>
        <PageHeader title="Configuración" description="Datos de la empresa." />
        <Card>
          <EmptyState
            icon={Lock}
            title="No tienes acceso a este módulo"
            description="La configuración de la empresa está reservada a los perfiles de administración."
          />
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Configuración" description="Datos de la empresa." />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-4 h-10 w-full" />
              <Skeleton className="mt-3 h-10 w-full" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const urlLogoActual = resolveImageUrl(logoActual)

  return (
    <div>
      <PageHeader
        title="Configuración"
        description="Datos de la empresa que se usan en todo el sistema."
      >
        {puedeEditar ? (
          <Button type="submit" form="form-configuracion" loading={saving}>
            <Save className="h-4 w-4" /> Guardar cambios
          </Button>
        ) : (
          <Badge variant="secondary">Solo lectura</Badge>
        )}
      </PageHeader>

      {!puedeEditar && (
        <p className="mb-4 rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          Puedes consultar estos datos, pero solo un Administrador puede modificarlos.
        </p>
      )}

      <form id="form-configuracion" onSubmit={handleSubmit} className="space-y-4">
        <Seccion title="Identidad" description="Cómo se identifica el negocio.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <FormField label="Nombre de la empresa" htmlFor="cf-nombre" required error={errors.nombre_empresa}>
                <Input
                  id="cf-nombre"
                  value={form.nombre_empresa}
                  onChange={(e) => set('nombre_empresa', e.target.value)}
                  disabled={!puedeEditar}
                  placeholder="JAGN Solution"
                />
              </FormField>
            </div>
            {/* Lista cerrada: el formato de cada importe (símbolo, separadores)
                depende de conocer la moneda, así que no se escribe a mano. */}
            <FormField
              label="Moneda"
              htmlFor="cf-moneda"
              required
              error={errors.moneda}
              hint="Se aplica a todos los importes del sistema"
            >
              <Select
                id="cf-moneda"
                value={form.moneda}
                onChange={(e) => set('moneda', e.target.value)}
                disabled={!puedeEditar}
              >
                {Object.entries(MONEDAS).map(([codigo, { label }]) => (
                  <option key={codigo} value={codigo}>{label}</option>
                ))}
              </Select>
            </FormField>
          </div>

          {/* Logo: se muestran el actual y el nuevo para poder compararlos. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">Logo actual</p>
              <div className="flex h-28 items-center justify-center rounded-md border border-border bg-muted/30 p-3">
                {urlLogoActual ? (
                  <img src={urlLogoActual} alt="Logo actual" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImageOff className="h-5 w-5" />
                    <span className="text-xs">Sin logo cargado</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">
                {logoPreview ? 'Logo nuevo' : 'Vista previa'}
              </p>
              <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-border bg-muted/30 p-3">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo nuevo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {puedeEditar ? 'Selecciona un archivo para verlo aquí' : 'Sin cambios'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {puedeEditar && (
            <FormField label="Reemplazar logo" htmlFor="cf-logo" hint="JPG, PNG, WEBP o GIF (opcional)">
              <Input
                id="cf-logo"
                type="file"
                accept="image/*"
                onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
                className="cursor-pointer file:mr-3 file:rounded file:bg-secondary file:px-3 file:py-1 file:text-secondary-foreground"
              />
            </FormField>
          )}
        </Seccion>

        <Seccion title="Contacto" description="Cómo te encuentran tus clientes.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Correo electrónico" htmlFor="cf-email" error={errors.email}>
              <Input
                id="cf-email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                disabled={!puedeEditar}
                placeholder="ventas@empresa.com"
              />
            </FormField>
            <FormField label="Teléfono" htmlFor="cf-telefono">
              <Input
                id="cf-telefono"
                value={form.telefono}
                onChange={(e) => set('telefono', e.target.value)}
                disabled={!puedeEditar}
                placeholder="+54 11 4000-0000"
              />
            </FormField>
            <FormField label="WhatsApp" htmlFor="cf-whatsapp">
              <Input
                id="cf-whatsapp"
                value={form.whatsapp}
                onChange={(e) => set('whatsapp', e.target.value)}
                disabled={!puedeEditar}
                placeholder="+54 9 11 5000-0000"
              />
            </FormField>
          </div>
        </Seccion>

        <Seccion title="Ubicación y atención">
          <FormField label="Dirección" htmlFor="cf-direccion">
            <Input
              id="cf-direccion"
              value={form.direccion}
              onChange={(e) => set('direccion', e.target.value)}
              disabled={!puedeEditar}
              placeholder="Av. Rivadavia 1234"
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Ciudad" htmlFor="cf-ciudad">
              <Input
                id="cf-ciudad"
                value={form.ciudad}
                onChange={(e) => set('ciudad', e.target.value)}
                disabled={!puedeEditar}
              />
            </FormField>
            <FormField label="Provincia" htmlFor="cf-provincia">
              <Input
                id="cf-provincia"
                value={form.provincia}
                onChange={(e) => set('provincia', e.target.value)}
                disabled={!puedeEditar}
              />
            </FormField>
          </div>
          <FormField label="Horario de atención" htmlFor="cf-horario">
            <Input
              id="cf-horario"
              value={form.horario_atencion}
              onChange={(e) => set('horario_atencion', e.target.value)}
              disabled={!puedeEditar}
              placeholder="Lun a Vie de 8 a 18 h · Sáb de 9 a 13 h"
            />
          </FormField>
        </Seccion>

        <Seccion title="Redes sociales" description="Puedes cargar la URL completa o el usuario.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['facebook', 'Facebook', 'facebook.com/tuempresa'],
              ['instagram', 'Instagram', '@tuempresa'],
              ['twitter', 'X / Twitter', '@tuempresa'],
              ['tiktok', 'TikTok', '@tuempresa'],
            ].map(([clave, label, placeholder]) => (
              <FormField key={clave} label={label} htmlFor={`cf-${clave}`}>
                <Input
                  id={`cf-${clave}`}
                  value={form[clave]}
                  onChange={(e) => set(clave, e.target.value)}
                  disabled={!puedeEditar}
                  placeholder={placeholder}
                />
              </FormField>
            ))}
          </div>
        </Seccion>

        {puedeEditar && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-4">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              Vaciar un campo opcional lo borra de la configuración.
            </p>
            <Button type="submit" loading={saving}>
              <Save className="h-4 w-4" /> Guardar cambios
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}
