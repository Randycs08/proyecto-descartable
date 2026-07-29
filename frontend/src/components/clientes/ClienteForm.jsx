/**
 * Formulario de creación/edición de un cliente. Se usa dentro de un Modal.
 * Notifica al padre vía onSubmit(payload).
 *
 * Soporta los dos tipos de cliente del negocio:
 *
 *   - PERSONA: nombre y apellido, normalmente con DNI.
 *   - EMPRESA: además de la razón social, se cargan el nombre y el apellido de
 *     la PERSONA DE CONTACTO, porque la columna `nombre` de la tabla es
 *     obligatoria también para las empresas. Suele identificarse con CUIT.
 *
 * El tipo no es una columna de la base: se deduce de si hay razón social. Al
 * editar se detecta solo.
 */

import { useEffect, useState } from 'react'
import { User, Building2 } from 'lucide-react'
import { Input } from '@/components/ui/Input.jsx'
import { Select } from '@/components/ui/Select.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { FormField } from '@/components/common/FormField.jsx'
import { cn } from '@/lib/utils.js'

// Debe coincidir con el ENUM `tipo_documento` del schema.
const TIPOS_DOCUMENTO = ['DNI', 'CUIT', 'CUIL', 'RUC', 'PASAPORTE', 'OTRO']

const EMPTY = {
  nombre: '', apellido: '', razon_social: '',
  tipo_documento: 'DNI', documento: '',
  email: '', telefono: '',
  direccion: '', ciudad: '', provincia: '', codigo_postal: '',
  activo: true,
}

/** Validación de email suficiente para la UI; la definitiva la hace la API. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ClienteForm({ initial, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState(EMPTY)
  const [esEmpresa, setEsEmpresa] = useState(false)
  const [errors, setErrors] = useState({})

  // Precarga al editar. El tipo se deduce de la razón social.
  useEffect(() => {
    if (initial) {
      setForm({
        nombre: initial.nombre ?? '',
        apellido: initial.apellido ?? '',
        razon_social: initial.razon_social ?? '',
        tipo_documento: initial.tipo_documento ?? 'DNI',
        documento: initial.documento ?? '',
        email: initial.email ?? '',
        telefono: initial.telefono ?? '',
        direccion: initial.direccion ?? '',
        ciudad: initial.ciudad ?? '',
        provincia: initial.provincia ?? '',
        codigo_postal: initial.codigo_postal ?? '',
        activo: Boolean(initial.activo),
      })
      setEsEmpresa(Boolean(initial.razon_social))
    } else {
      setForm(EMPTY)
      setEsEmpresa(false)
    }
    setErrors({})
  }, [initial])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  /**
   * Cambia entre persona y empresa.
   * Al pasar a persona se limpia la razón social (viaja vacía y la API la
   * guarda como NULL). El tipo de documento se ajusta solo mientras no se haya
   * cargado ninguno, para no pisar un dato ya ingresado.
   */
  function cambiarTipo(empresa) {
    setEsEmpresa(empresa)
    setForm((f) => ({
      ...f,
      razon_social: empresa ? f.razon_social : '',
      tipo_documento: f.documento ? f.tipo_documento : (empresa ? 'CUIT' : 'DNI'),
    }))
    setErrors({})
  }

  function validate() {
    const e = {}
    if (!form.nombre.trim()) {
      e.nombre = esEmpresa ? 'El nombre del contacto es obligatorio' : 'El nombre es obligatorio'
    }
    if (esEmpresa && !form.razon_social.trim()) {
      e.razon_social = 'La razón social es obligatoria'
    }
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
      e.email = 'El email no es válido'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    if (!validate()) return
    // Se envía el formulario completo: los campos vacíos limpian el dato en la
    // base (la API los convierte a NULL).
    onSubmit({ ...form })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Selector de tipo de cliente */}
      <FormField label="Tipo de cliente">
        <div className="grid grid-cols-2 gap-2">
          {[
            { valor: false, etiqueta: 'Persona', icono: User },
            { valor: true, etiqueta: 'Empresa', icono: Building2 },
          ].map(({ valor, etiqueta, icono: Icono }) => (
            <button
              key={etiqueta}
              type="button"
              onClick={() => cambiarTipo(valor)}
              className={cn(
                'flex h-10 items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors',
                esEmpresa === valor
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input bg-background text-muted-foreground hover:bg-accent'
              )}
            >
              <Icono className="h-4 w-4" /> {etiqueta}
            </button>
          ))}
        </div>
      </FormField>

      {esEmpresa && (
        <FormField label="Razón social" htmlFor="cli-razon" required error={errors.razon_social}>
          <Input
            id="cli-razon"
            value={form.razon_social}
            onChange={(e) => set('razon_social', e.target.value)}
            placeholder="Ej: Rotisería La Esquina S.R.L."
          />
        </FormField>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label={esEmpresa ? 'Nombre del contacto' : 'Nombre'}
          htmlFor="cli-nombre"
          required
          error={errors.nombre}
        >
          <Input
            id="cli-nombre"
            value={form.nombre}
            onChange={(e) => set('nombre', e.target.value)}
            placeholder="Ej: Martín"
          />
        </FormField>
        <FormField label={esEmpresa ? 'Apellido del contacto' : 'Apellido'} htmlFor="cli-apellido">
          <Input
            id="cli-apellido"
            value={form.apellido}
            onChange={(e) => set('apellido', e.target.value)}
            placeholder="Ej: Sosa"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Tipo de documento" htmlFor="cli-tipodoc">
          <Select
            id="cli-tipodoc"
            value={form.tipo_documento}
            onChange={(e) => set('tipo_documento', e.target.value)}
          >
            {TIPOS_DOCUMENTO.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </FormField>
        <FormField
          label="Documento"
          htmlFor="cli-documento"
          hint="Opcional. No puede repetirse para el mismo tipo."
        >
          <Input
            id="cli-documento"
            value={form.documento}
            onChange={(e) => set('documento', e.target.value)}
            placeholder={esEmpresa ? '30-71234567-8' : '30111222'}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Email" htmlFor="cli-email" error={errors.email}>
          <Input
            id="cli-email"
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="cliente@example.com"
          />
        </FormField>
        <FormField label="Teléfono" htmlFor="cli-telefono">
          <Input
            id="cli-telefono"
            value={form.telefono}
            onChange={(e) => set('telefono', e.target.value)}
            placeholder="+54 11 4000-0000"
          />
        </FormField>
      </div>

      <FormField label="Dirección" htmlFor="cli-direccion">
        <Input
          id="cli-direccion"
          value={form.direccion}
          onChange={(e) => set('direccion', e.target.value)}
          placeholder="Av. Rivadavia 1234"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <FormField label="Ciudad" htmlFor="cli-ciudad">
          <Input
            id="cli-ciudad"
            value={form.ciudad}
            onChange={(e) => set('ciudad', e.target.value)}
          />
        </FormField>
        <FormField label="Provincia" htmlFor="cli-provincia">
          <Input
            id="cli-provincia"
            value={form.provincia}
            onChange={(e) => set('provincia', e.target.value)}
          />
        </FormField>
        <FormField label="C. postal" htmlFor="cli-cp">
          <Input
            id="cli-cp"
            value={form.codigo_postal}
            onChange={(e) => set('codigo_postal', e.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Estado">
        <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input px-3">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[hsl(var(--primary))]"
            checked={form.activo}
            onChange={(e) => set('activo', e.target.checked)}
          />
          <span className="text-sm text-foreground">Activo</span>
        </label>
      </FormField>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          {initial ? 'Guardar cambios' : 'Crear cliente'}
        </Button>
      </div>
    </form>
  )
}
