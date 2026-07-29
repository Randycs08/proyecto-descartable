/**
 * Formulario de creación/edición de producto. Carga las categorías para el
 * <select>, valida los campos obligatorios y sube una imagen opcional.
 */

import { useEffect, useState } from 'react'
import { categoriaService } from '@/services/categoria.service.js'
import { notify } from '@/lib/toast.js'
import { Input } from '@/components/ui/Input.jsx'
import { Textarea } from '@/components/ui/Textarea.jsx'
import { Select } from '@/components/ui/Select.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { FormField } from '@/components/common/FormField.jsx'

const EMPTY = {
  sku: '', nombre: '', descripcion: '', categoria_id: '',
  precio: '', precio_costo: '', stock: 0, stock_minimo: 0,
  unidad_medida: 'unidad', unidades_por_paquete: '', destacado: false, activo: true,
}

export function ProductoForm({ initial, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState(EMPTY)
  const [imagen, setImagen] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [errors, setErrors] = useState({})

  // Carga de categorías para el selector.
  useEffect(() => {
    categoriaService
      .list({ limit: 100, activo: true })
      .then((res) => setCategorias(res.data))
      .catch((err) => notify.fromApiError(err, 'No se pudieron cargar las categorías'))
  }, [])

  // Precarga al editar.
  useEffect(() => {
    if (initial) {
      setForm({
        sku: initial.sku ?? '',
        nombre: initial.nombre ?? '',
        descripcion: initial.descripcion ?? '',
        categoria_id: initial.categoria_id ?? '',
        precio: initial.precio ?? '',
        precio_costo: initial.precio_costo ?? '',
        stock: initial.stock ?? 0,
        stock_minimo: initial.stock_minimo ?? 0,
        unidad_medida: initial.unidad_medida ?? 'unidad',
        unidades_por_paquete: initial.unidades_por_paquete ?? '',
        destacado: Boolean(initial.destacado),
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
    if (!form.sku.trim()) e.sku = 'El SKU es obligatorio'
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio'
    if (!form.categoria_id) e.categoria_id = 'Selecciona una categoría'
    if (form.precio === '' || Number(form.precio) < 0) e.precio = 'Precio inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    if (!validate()) return

    // Se normalizan booleanos a string (multipart) y se omite la imagen si no cambió.
    const payload = {
      ...form,
      destacado: form.destacado ? 'true' : 'false',
      activo: form.activo ? 'true' : 'false',
    }
    if (imagen) payload.imagen = imagen
    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="SKU" htmlFor="p-sku" required error={errors.sku}>
          <Input id="p-sku" value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="VAS-PL-180" />
        </FormField>
        <FormField label="Categoría" htmlFor="p-cat" required error={errors.categoria_id}>
          <Select id="p-cat" value={form.categoria_id} onChange={(e) => set('categoria_id', e.target.value)}>
            <option value="">Seleccionar...</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label="Nombre" htmlFor="p-nombre" required error={errors.nombre}>
        <Input id="p-nombre" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Vaso plástico 180cc x100" />
      </FormField>

      <FormField label="Descripción" htmlFor="p-desc">
        <Textarea id="p-desc" rows={2} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Precio de venta" htmlFor="p-precio" required error={errors.precio}>
          <Input id="p-precio" type="number" min={0} step="0.01" value={form.precio} onChange={(e) => set('precio', e.target.value)} placeholder="0.00" />
        </FormField>
        <FormField label="Costo" htmlFor="p-costo">
          <Input id="p-costo" type="number" min={0} step="0.01" value={form.precio_costo} onChange={(e) => set('precio_costo', e.target.value)} placeholder="0.00" />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <FormField label="Stock" htmlFor="p-stock">
          <Input id="p-stock" type="number" min={0} value={form.stock} onChange={(e) => set('stock', e.target.value)} />
        </FormField>
        <FormField label="Stock mín." htmlFor="p-stockmin">
          <Input id="p-stockmin" type="number" min={0} value={form.stock_minimo} onChange={(e) => set('stock_minimo', e.target.value)} />
        </FormField>
        <FormField label="Unidad" htmlFor="p-unidad">
          <Select id="p-unidad" value={form.unidad_medida} onChange={(e) => set('unidad_medida', e.target.value)}>
            <option value="unidad">Unidad</option>
            <option value="paquete">Paquete</option>
            <option value="caja">Caja</option>
            <option value="kg">Kg</option>
          </Select>
        </FormField>
        <FormField label="U. x paq." htmlFor="p-upp">
          <Input id="p-upp" type="number" min={1} value={form.unidades_por_paquete} onChange={(e) => set('unidades_por_paquete', e.target.value)} placeholder="—" />
        </FormField>
      </div>

      <FormField label="Imagen" htmlFor="p-img" hint="JPG, PNG o WEBP (opcional)">
        <Input
          id="p-img"
          type="file"
          accept="image/*"
          onChange={(e) => setImagen(e.target.files?.[0] ?? null)}
          className="cursor-pointer file:mr-3 file:rounded file:bg-secondary file:px-3 file:py-1 file:text-secondary-foreground"
        />
      </FormField>

      <div className="flex flex-wrap gap-4">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={form.destacado} onChange={(e) => set('destacado', e.target.checked)} />
          <span className="text-sm text-foreground">Destacado</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={form.activo} onChange={(e) => set('activo', e.target.checked)} />
          <span className="text-sm text-foreground">Activo</span>
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          {initial ? 'Guardar cambios' : 'Crear producto'}
        </Button>
      </div>
    </form>
  )
}
