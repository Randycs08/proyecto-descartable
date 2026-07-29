/**
 * Formulario de creación/edición de una categoría. Se usa dentro de un Modal.
 * Sube opcionalmente una imagen. Notifica al padre vía onSubmit(payload).
 */

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/Input.jsx'
import { Textarea } from '@/components/ui/Textarea.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { FormField } from '@/components/common/FormField.jsx'

const EMPTY = { nombre: '', descripcion: '', orden: 0, activo: true }

export function CategoriaForm({ initial, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState(EMPTY)
  const [imagen, setImagen] = useState(null)
  const [errors, setErrors] = useState({})

  // Precarga los datos al editar.
  useEffect(() => {
    if (initial) {
      setForm({
        nombre: initial.nombre ?? '',
        descripcion: initial.descripcion ?? '',
        orden: initial.orden ?? 0,
        activo: Boolean(initial.activo),
      })
    } else {
      setForm(EMPTY)
    }
    setImagen(null)
    setErrors({})
  }, [initial])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function validate() {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    if (!validate()) return
    // Se arma el payload; la imagen solo si se seleccionó una nueva.
    const payload = { ...form, activo: form.activo ? 'true' : 'false' }
    if (imagen) payload.imagen = imagen
    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nombre" htmlFor="cat-nombre" required error={errors.nombre}>
        <Input
          id="cat-nombre"
          value={form.nombre}
          onChange={(e) => set('nombre', e.target.value)}
          placeholder="Ej: Vasos"
        />
      </FormField>

      <FormField label="Descripción" htmlFor="cat-desc">
        <Textarea
          id="cat-desc"
          value={form.descripcion}
          onChange={(e) => set('descripcion', e.target.value)}
          placeholder="Descripción breve de la categoría"
          rows={3}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Orden" htmlFor="cat-orden" hint="Posición en el listado">
          <Input
            id="cat-orden"
            type="number"
            min={0}
            value={form.orden}
            onChange={(e) => set('orden', e.target.value)}
          />
        </FormField>

        <FormField label="Estado">
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input px-3">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[hsl(var(--primary))]"
              checked={form.activo}
              onChange={(e) => set('activo', e.target.checked)}
            />
            <span className="text-sm text-foreground">Activa</span>
          </label>
        </FormField>
      </div>

      <FormField label="Imagen" htmlFor="cat-img" hint="JPG, PNG o WEBP (opcional)">
        <Input
          id="cat-img"
          type="file"
          accept="image/*"
          onChange={(e) => setImagen(e.target.files?.[0] ?? null)}
          className="cursor-pointer file:mr-3 file:rounded file:bg-secondary file:px-3 file:py-1 file:text-secondary-foreground"
        />
      </FormField>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          {initial ? 'Guardar cambios' : 'Crear categoría'}
        </Button>
      </div>
    </form>
  )
}
