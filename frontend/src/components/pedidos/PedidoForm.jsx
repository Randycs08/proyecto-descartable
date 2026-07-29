/**
 * Alta de pedido: cliente, líneas de detalle y datos de la cabecera.
 *
 * Los importes que se ven acá son una VISTA PREVIA. El servidor copia el precio
 * del catálogo al momento de la venta y recalcula subtotal y total; lo que se
 * mande desde el navegador se ignora. Se muestran igual porque quien carga el
 * pedido necesita ver el total antes de confirmarlo.
 *
 * Un producto no puede repetirse en dos líneas (la tabla tiene
 * UNIQUE (pedido_id, producto_id)). En vez de dejar que el backend lo rechace,
 * al agregar uno que ya está se le suma la cantidad a la línea existente.
 *
 * El pedido no se puede editar una vez creado: cambiar sus líneas obligaría a
 * recalcular el stock ya descontado. Por eso este formulario es solo de alta.
 */

import { useCallback, useMemo, useState } from 'react'
import { Plus, Trash2, PackageSearch } from 'lucide-react'
import { clienteService } from '@/services/cliente.service.js'
import { productoService } from '@/services/producto.service.js'
import { notify } from '@/lib/toast.js'
import { formatCurrency } from '@/lib/utils.js'
import { METODOS_PAGO, ESTADOS_PAGO } from '@/constants/pedidos.js'
import { Input } from '@/components/ui/Input.jsx'
import { Textarea } from '@/components/ui/Textarea.jsx'
import { Select } from '@/components/ui/Select.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { FormField } from '@/components/common/FormField.jsx'
import { Autocomplete } from '@/components/common/Autocomplete.jsx'

/** Cómo se llama un cliente en pantalla: razón social o nombre y apellido. */
const nombreCliente = (c) =>
  c?.razon_social || [c?.nombre, c?.apellido].filter(Boolean).join(' ') || '—'

/** Redondeo a 2 decimales, igual que hace el backend. */
const redondear = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100

const CABECERA_VACIA = {
  metodo_pago: '',
  estado_pago: '',
  descuento: '',
  impuestos: '',
  direccion_entrega: '',
  distrito: '',
  referencia_entrega: '',
  notas: '',
}

export function PedidoForm({ onSubmit, onCancel, submitting }) {
  const [cliente, setCliente] = useState(null)
  const [lineas, setLineas] = useState([])
  const [cabecera, setCabecera] = useState(CABECERA_VACIA)
  const [errors, setErrors] = useState({})

  // --- Búsquedas del autocompletado -------------------------------------------
  const buscarClientes = useCallback(async (q) => {
    const { data } = await clienteService.list({ search: q, activo: true, limit: 8 })
    return data
  }, [])

  const buscarProductos = useCallback(async (q) => {
    const { data } = await productoService.list({ search: q, activo: true, limit: 8 })
    return data
  }, [])

  // --- Líneas ------------------------------------------------------------------
  function agregarProducto(producto) {
    if (!producto) return
    setLineas((actuales) => {
      const i = actuales.findIndex((l) => l.producto.id === producto.id)
      if (i === -1) return [...actuales, { producto, cantidad: 1, descuento: '' }]
      // Ya estaba: se suma en la línea existente en lugar de duplicarla.
      notify.success(`Se sumó una unidad a "${producto.nombre}"`)
      return actuales.map((l, idx) => (idx === i ? { ...l, cantidad: Number(l.cantidad) + 1 } : l))
    })
  }

  function cambiarLinea(id, campo, valor) {
    setLineas((actuales) =>
      actuales.map((l) => (l.producto.id === id ? { ...l, [campo]: valor } : l))
    )
  }

  function quitarLinea(id) {
    setLineas((actuales) => actuales.filter((l) => l.producto.id !== id))
  }

  // --- Importes (vista previa) --------------------------------------------------
  const totales = useMemo(() => {
    const conSubtotal = lineas.map((l) => {
      const cantidad = Number(l.cantidad) || 0
      const bruto = redondear(cantidad * Number(l.producto.precio))
      const descuento = redondear(Number(l.descuento) || 0)
      return { ...l, cantidad, bruto, descuentoLinea: descuento, subtotal: redondear(bruto - descuento) }
    })
    const subtotal = redondear(conSubtotal.reduce((acc, l) => acc + l.subtotal, 0))
    const descuento = redondear(Number(cabecera.descuento) || 0)
    const impuestos = redondear(Number(cabecera.impuestos) || 0)
    return { conSubtotal, subtotal, descuento, impuestos, total: redondear(subtotal - descuento + impuestos) }
  }, [lineas, cabecera.descuento, cabecera.impuestos])

  // --- Validación ----------------------------------------------------------------
  function validate() {
    const e = {}
    if (!cliente) e.cliente = 'Selecciona un cliente'
    if (lineas.length === 0) e.detalle = 'Agrega al menos un producto'

    for (const l of totales.conSubtotal) {
      if (!Number.isInteger(l.cantidad) || l.cantidad < 1) {
        e[`linea_${l.producto.id}`] = 'La cantidad debe ser un entero mayor a 0'
      } else if (l.cantidad > l.producto.stock) {
        // El backend también lo rechaza, pero avisar acá evita perder la carga.
        e[`linea_${l.producto.id}`] = `Solo hay ${l.producto.stock} en stock`
      } else if (l.subtotal < 0) {
        e[`linea_${l.producto.id}`] = 'El descuento supera el importe de la línea'
      }
    }

    if (totales.total < 0) e.descuento = 'El descuento no puede superar el subtotal'

    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    if (!validate()) return

    const payload = {
      cliente_id: cliente.id,
      detalle: lineas.map((l) => {
        const linea = { producto_id: l.producto.id, cantidad: Number(l.cantidad) }
        if (Number(l.descuento) > 0) linea.descuento = Number(l.descuento)
        return linea
      }),
    }
    // Los opcionales vacíos no se envían: el backend les aplica su valor por defecto.
    for (const [clave, valor] of Object.entries(cabecera)) {
      if (valor !== '' && valor !== null) payload[clave] = valor
    }
    onSubmit(payload)
  }

  const set = (clave, valor) => setCabecera((c) => ({ ...c, [clave]: valor }))

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Cliente */}
      <FormField label="Cliente" htmlFor="pe-cliente" required error={errors.cliente}>
        <Autocomplete
          id="pe-cliente"
          value={cliente}
          onSelect={setCliente}
          onSearch={buscarClientes}
          getLabel={nombreCliente}
          invalid={Boolean(errors.cliente)}
          placeholder="Buscar por nombre, razón social o documento..."
          emptyText="Ningún cliente activo coincide"
          renderItem={(c) => (
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate">{nombreCliente(c)}</span>
              {c.documento && (
                <span className="flex-shrink-0 text-xs text-muted-foreground">
                  {c.tipo_documento} {c.documento}
                </span>
              )}
            </div>
          )}
        />
      </FormField>

      {/* Detalle */}
      <div className="space-y-2">
        <FormField label="Agregar productos" htmlFor="pe-producto" error={errors.detalle}>
          <Autocomplete
            id="pe-producto"
            value={null}
            onSelect={agregarProducto}
            onSearch={buscarProductos}
            invalid={Boolean(errors.detalle)}
            placeholder="Buscar por nombre o SKU..."
            emptyText="Ningún producto activo coincide"
            renderItem={(p) => (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate">{p.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    SKU {p.sku} · {formatCurrency(p.precio)}
                  </p>
                </div>
                <Badge variant={p.stock <= p.stock_minimo ? 'destructive' : 'secondary'}>
                  {p.stock} disp.
                </Badge>
              </div>
            )}
          />
        </FormField>

        {lineas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-8 text-center">
            <PackageSearch className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Buscá un producto arriba para agregarlo al pedido.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Producto
                  </th>
                  <th className="w-24 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cant.
                  </th>
                  <th className="hidden w-28 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">
                    Desc.
                  </th>
                  <th className="w-28 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Subtotal
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {totales.conSubtotal.map((l) => {
                  const error = errors[`linea_${l.producto.id}`]
                  return (
                    <tr key={l.producto.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <p className="font-medium text-foreground">{l.producto.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          SKU {l.producto.sku} · {formatCurrency(l.producto.precio)} c/u ·{' '}
                          {l.producto.stock} en stock
                        </p>
                        {error && <p className="mt-1 text-xs font-medium text-destructive">{error}</p>}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          value={l.cantidad}
                          aria-label={`Cantidad de ${l.producto.nombre}`}
                          onChange={(e) =>
                            cambiarLinea(l.producto.id, 'cantidad', e.target.value === '' ? '' : Number(e.target.value))
                          }
                          className={error ? 'h-9 border-destructive' : 'h-9'}
                        />
                      </td>
                      <td className="hidden px-3 py-2 sm:table-cell">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0.00"
                          value={l.descuento}
                          aria-label={`Descuento de ${l.producto.nombre}`}
                          onChange={(e) => cambiarLinea(l.producto.id, 'descuento', e.target.value)}
                          className="h-9"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-foreground">
                        {formatCurrency(l.subtotal)}
                      </td>
                      <td className="px-1 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => quitarLinea(l.producto.id)}
                          aria-label={`Quitar ${l.producto.nombre}`}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cabecera */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Método de pago" htmlFor="pe-metodo">
          <Select id="pe-metodo" value={cabecera.metodo_pago} onChange={(e) => set('metodo_pago', e.target.value)}>
            <option value="">Sin especificar</option>
            {Object.entries(METODOS_PAGO).map(([valor, label]) => (
              <option key={valor} value={valor}>{label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Estado del pago" htmlFor="pe-estadopago">
          <Select id="pe-estadopago" value={cabecera.estado_pago} onChange={(e) => set('estado_pago', e.target.value)}>
            <option value="">Pendiente (por defecto)</option>
            {Object.entries(ESTADOS_PAGO).map(([valor, { label }]) => (
              <option key={valor} value={valor}>{label}</option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Descuento del pedido" htmlFor="pe-descuento" error={errors.descuento}>
          <Input
            id="pe-descuento"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={cabecera.descuento}
            onChange={(e) => set('descuento', e.target.value)}
          />
        </FormField>
        <FormField label="Impuestos" htmlFor="pe-impuestos">
          <Input
            id="pe-impuestos"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={cabecera.impuestos}
            onChange={(e) => set('impuestos', e.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Dirección de entrega" htmlFor="pe-direccion">
        <Input
          id="pe-direccion"
          value={cabecera.direccion_entrega}
          onChange={(e) => set('direccion_entrega', e.target.value)}
          placeholder="Av. Arequipa 1234"
        />
      </FormField>

      {/* Distrito y referencia van en columnas propias del pedido: así se puede
          agrupar las entregas por zona sin tener que partir la dirección. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Distrito" htmlFor="pe-distrito">
          <Input
            id="pe-distrito"
            value={cabecera.distrito}
            onChange={(e) => set('distrito', e.target.value)}
            placeholder="Miraflores"
          />
        </FormField>
        <FormField label="Referencia" htmlFor="pe-referencia">
          <Input
            id="pe-referencia"
            value={cabecera.referencia_entrega}
            onChange={(e) => set('referencia_entrega', e.target.value)}
            placeholder="Frente al parque"
          />
        </FormField>
      </div>

      <FormField label="Notas" htmlFor="pe-notas">
        <Textarea id="pe-notas" rows={2} value={cabecera.notas} onChange={(e) => set('notas', e.target.value)} />
      </FormField>

      {/* Totales */}
      <dl className="space-y-1.5 rounded-md bg-muted/50 p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-medium text-foreground">{formatCurrency(totales.subtotal)}</dd>
        </div>
        {totales.descuento > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Descuento</dt>
            <dd className="font-medium text-destructive">− {formatCurrency(totales.descuento)}</dd>
          </div>
        )}
        {totales.impuestos > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Impuestos</dt>
            <dd className="font-medium text-foreground">{formatCurrency(totales.impuestos)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-1.5 text-base">
          <dt className="font-semibold text-foreground">Total</dt>
          <dd className="font-bold text-foreground">{formatCurrency(totales.total)}</dd>
        </div>
      </dl>

      <p className="text-xs text-muted-foreground">
        Al crear el pedido se descuenta el stock de cada producto. Si después se
        cancela, las unidades vuelven automáticamente.
      </p>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          <Plus className="h-4 w-4" /> Crear pedido
        </Button>
      </div>
    </form>
  )
}
