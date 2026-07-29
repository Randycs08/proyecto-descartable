/**
 * Datos del comprador y confirmación del pedido.
 *
 * Antes de mostrar el resumen se vuelve a consultar cada producto del carrito.
 * El carrito vive en localStorage y puede tener días: en ese tiempo el precio
 * pudo cambiar y el stock agotarse. Si algo cambió se avisa y se actualizan los
 * importes ANTES de que la persona confirme, en vez de dejar que se entere con
 * un error al enviar.
 *
 * De todas formas, los importes de esta pantalla son informativos: al servidor
 * solo se le mandan `producto_id` y `cantidad`, y él recalcula todo con el
 * catálogo del momento. Es la misma verificación, hecha dos veces, porque la de
 * acá es para la persona y la del backend es la que manda.
 *
 * El carrito se vacía únicamente cuando la API confirmó el pedido.
 *
 * Cada visita a esta pantalla estrena una clave de intento que viaja con el
 * envío. Si el pedido se manda dos veces, el servidor devuelve el primero en vez
 * de crear otro; el botón deshabilitado tapa el doble clic, pero no la conexión
 * que se corta después de que el pedido ya se registró.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, AlertTriangle, Loader2, Lock } from 'lucide-react'
import {
  publicoService,
  nuevaClaveIntento,
  METODOS_PAGO,
  TIPOS_DOCUMENTO,
} from '@/services/publico.service.js'
import { useCarrito } from '@/hooks/useCarrito.js'
import { useConfiguracionPublica } from '@/components/layout/PublicLayout.jsx'
import { notify } from '@/lib/toast.js'
import { formatCurrency } from '@/lib/utils.js'
import { Card, CardContent } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Input } from '@/components/ui/Input.jsx'
import { Select } from '@/components/ui/Select.jsx'
import { Textarea } from '@/components/ui/Textarea.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { FormField } from '@/components/common/FormField.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { ImagenProducto } from '@/components/publico/ImagenProducto.jsx'

const FORM_VACIO = {
  tipo: 'persona',
  nombre: '', apellido: '', razon_social: '',
  tipo_documento: 'DNI', documento: '',
  telefono: '', email: '',
  direccion: '', distrito: '', referencia: '',
  metodo_pago: 'efectivo', notas: '',
}

export default function Checkout() {
  const navigate = useNavigate()
  const config = useConfiguracionPublica()
  const { items, subtotal, vacio, cambiarCantidad, quitar, vaciar, sincronizar } = useCarrito()

  const [form, setForm] = useState(FORM_VACIO)
  const [errors, setErrors] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [revalidando, setRevalidando] = useState(true)
  const [avisos, setAvisos] = useState([])

  // Se conserva entre reenvíos: es lo que hace que un reintento devuelva el
  // pedido original. Solo se renueva cuando uno se registró de verdad.
  const claveIntento = useRef(null)
  if (!claveIntento.current) claveIntento.current = nuevaClaveIntento()

  const set = (clave, valor) => setForm((f) => ({ ...f, [clave]: valor }))

  // --- Revalidación contra el catálogo ---------------------------------------
  const revalidar = useCallback(async () => {
    if (items.length === 0) { setRevalidando(false); return }
    setRevalidando(true)

    const nuevos = []
    const frescos = []

    for (const item of items) {
      try {
        const producto = await publicoService.getProducto(item.slug)
        frescos.push(producto)

        if (Number(producto.precio) !== Number(item.precio)) {
          nuevos.push(`El precio de "${producto.nombre}" cambió a ${formatCurrency(producto.precio)}.`)
        }
        if (producto.stock <= 0) {
          nuevos.push(`"${producto.nombre}" se quedó sin stock.`)
        } else if (producto.stock < item.cantidad) {
          nuevos.push(`De "${producto.nombre}" quedan ${producto.stock} unidades.`)
        }
      } catch (err) {
        // 404 = el producto dejó de publicarse (se dio de baja o cambió de estado).
        if (err?.status === 404) {
          nuevos.push(`"${item.nombre}" ya no está disponible y se quitó del carrito.`)
          quitar(item.id)
        }
      }
    }

    if (frescos.length) sincronizar(frescos)
    setAvisos(nuevos)
    setRevalidando(false)
    // Se ejecuta al entrar a la pantalla; no debe repetirse con cada cambio de
    // cantidad, que es una edición del propio visitante.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { revalidar() }, [revalidar])

  // --- Validación -------------------------------------------------------------
  function validate() {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'Ingresa tu nombre'
    if (form.tipo === 'empresa' && !form.razon_social.trim()) {
      e.razon_social = 'Ingresa la razón social'
    }
    if (!form.documento.trim()) e.documento = 'Ingresa tu número de documento'
    else if (form.documento.trim().length < 6) e.documento = 'El documento es demasiado corto'
    if (!form.telefono.trim()) e.telefono = 'Necesitamos un teléfono para coordinar la entrega'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'El correo no es válido'
    if (!form.direccion.trim()) e.direccion = 'Ingresa la dirección de entrega'
    if (!form.distrito.trim()) e.distrito = 'Ingresa el distrito'

    const sinStock = items.find((i) => i.cantidad > i.stock)
    if (sinStock) e.items = `No hay stock suficiente de "${sinStock.nombre}"`

    setErrors(e)
    return Object.keys(e).length === 0
  }

  /** Traduce los errores del backend (`cliente.documento`) a campos del formulario. */
  function aplicarErroresDelServidor(lista) {
    if (!Array.isArray(lista) || lista.length === 0) return false
    const mapeados = {}
    for (const { campo, mensaje } of lista) {
      const clave = String(campo || '').replace(/^cliente\./, '')
      mapeados[clave in FORM_VACIO ? clave : 'items'] = mensaje
    }
    setErrors(mapeados)
    return true
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    if (!validate()) return

    setEnviando(true)
    try {
      const pedido = await publicoService.crearPedido(
        {
          cliente: {
            tipo: form.tipo,
            nombre: form.nombre.trim(),
            apellido: form.apellido.trim(),
            razon_social: form.tipo === 'empresa' ? form.razon_social.trim() : '',
            tipo_documento: form.tipo_documento,
            documento: form.documento.trim(),
            telefono: form.telefono.trim(),
            email: form.email.trim(),
            direccion: form.direccion.trim(),
            distrito: form.distrito.trim(),
            referencia: form.referencia.trim(),
          },
          metodo_pago: form.metodo_pago,
          notas: form.notas.trim(),
          // Solo qué y cuánto: el precio lo pone el servidor.
          items: items.map((i) => ({ producto_id: i.id, cantidad: i.cantidad })),
        },
        claveIntento.current
      )

      // Este pedido ya está cerrado: el próximo tiene que ser otro. Si no se
      // renovara, una segunda compra devolvería el pedido anterior.
      claveIntento.current = nuevaClaveIntento()

      // Recién con el pedido confirmado se vacía el carrito.
      vaciar()
      navigate('/pedido-confirmado', { replace: true, state: { pedido } })
    } catch (err) {
      if (!aplicarErroresDelServidor(err?.errors)) {
        // 409 (stock) y 429 (demasiados pedidos) traen un mensaje ya redactado.
        notify.fromApiError(err, 'No pudimos registrar tu pedido')
      }
      if (err?.status === 409) {
        notify.fromApiError(err, 'No hay stock suficiente')
        revalidar()
      }
    } finally {
      setEnviando(false)
    }
  }

  // --- Carrito vacío -----------------------------------------------------------
  if (vacio) {
    return (
      <div className="container-site py-16">
        <Card>
          <EmptyState
            icon={ShoppingCart}
            title="Tu carrito está vacío"
            description="Agrega productos del catálogo para poder hacer un pedido."
            action={
              <Link to="/catalogo" className="mt-2">
                <Button>Ver catálogo</Button>
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="container-site py-8">
      <Link
        to="/catalogo"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Seguir comprando
      </Link>

      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Finalizar pedido</h1>
      <p className="mt-2 text-muted-foreground">
        Completa tus datos y coordinamos la entrega por WhatsApp. No se cobra
        nada en línea.
      </p>

      {avisos.length > 0 && (
        <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
            <AlertTriangle className="h-4 w-4" /> El catálogo cambió desde que armaste el carrito
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-800">
            {avisos.map((aviso) => <li key={aviso}>{aviso}</li>)}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Datos */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="border-b border-border p-5">
              <h2 className="font-semibold text-foreground">Tus datos</h2>
            </div>
            <CardContent className="space-y-4 p-5">
              <div className="flex gap-2">
                {[['persona', 'Persona'], ['empresa', 'Empresa']].map(([valor, label]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => set('tipo', valor)}
                    className={
                      'flex-1 rounded-md border p-3 text-sm font-medium transition-colors ' +
                      (form.tipo === valor
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border text-muted-foreground hover:bg-accent')
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              {form.tipo === 'empresa' && (
                <FormField label="Razón social" htmlFor="ck-razon" required error={errors.razon_social}>
                  <Input
                    id="ck-razon"
                    value={form.razon_social}
                    onChange={(e) => set('razon_social', e.target.value)}
                    placeholder="Distribuidora del Sur S.A.C."
                  />
                </FormField>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label={form.tipo === 'empresa' ? 'Nombre del contacto' : 'Nombre'}
                  htmlFor="ck-nombre"
                  required
                  error={errors.nombre}
                >
                  <Input id="ck-nombre" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} />
                </FormField>
                <FormField
                  label={form.tipo === 'empresa' ? 'Apellido del contacto' : 'Apellido'}
                  htmlFor="ck-apellido"
                  error={errors.apellido}
                >
                  <Input id="ck-apellido" value={form.apellido} onChange={(e) => set('apellido', e.target.value)} />
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label="Tipo de doc." htmlFor="ck-tipodoc">
                  <Select
                    id="ck-tipodoc"
                    value={form.tipo_documento}
                    onChange={(e) => set('tipo_documento', e.target.value)}
                  >
                    {TIPOS_DOCUMENTO.map((t) => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label="Número de documento" htmlFor="ck-doc" required error={errors.documento}>
                    <Input
                      id="ck-doc"
                      value={form.documento}
                      onChange={(e) => set('documento', e.target.value)}
                      placeholder="45678912"
                    />
                  </FormField>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Teléfono" htmlFor="ck-tel" required error={errors.telefono}>
                  <Input
                    id="ck-tel"
                    value={form.telefono}
                    onChange={(e) => set('telefono', e.target.value)}
                    placeholder="998 268 132"
                  />
                </FormField>
                <FormField label="Correo" htmlFor="ck-email" error={errors.email} hint="Opcional">
                  <Input
                    id="ck-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          <Card>
            <div className="border-b border-border p-5">
              <h2 className="font-semibold text-foreground">Entrega</h2>
            </div>
            <CardContent className="space-y-4 p-5">
              <FormField label="Dirección" htmlFor="ck-dir" required error={errors.direccion}>
                <Input
                  id="ck-dir"
                  value={form.direccion}
                  onChange={(e) => set('direccion', e.target.value)}
                  placeholder="Av. Arequipa 1234"
                />
              </FormField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Distrito" htmlFor="ck-distrito" required error={errors.distrito}>
                  <Input
                    id="ck-distrito"
                    value={form.distrito}
                    onChange={(e) => set('distrito', e.target.value)}
                    placeholder="Miraflores"
                  />
                </FormField>
                <FormField label="Referencia" htmlFor="ck-ref" hint="Opcional" error={errors.referencia}>
                  <Input
                    id="ck-ref"
                    value={form.referencia}
                    onChange={(e) => set('referencia', e.target.value)}
                    placeholder="Frente al parque"
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          <Card>
            <div className="border-b border-border p-5">
              <h2 className="font-semibold text-foreground">Pago</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                No se cobra nada ahora: coordinamos el pago al confirmar el pedido.
              </p>
            </div>
            <CardContent className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {METODOS_PAGO.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set('metodo_pago', value)}
                    className={
                      'rounded-md border p-3 text-sm font-medium transition-colors ' +
                      (form.metodo_pago === value
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border text-muted-foreground hover:bg-accent')
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              <FormField label="Notas" htmlFor="ck-notas" hint="Horario preferido, indicaciones, etc.">
                <Textarea
                  id="ck-notas"
                  rows={2}
                  value={form.notas}
                  onChange={(e) => set('notas', e.target.value)}
                />
              </FormField>
            </CardContent>
          </Card>
        </div>

        {/* Resumen */}
        <div>
          <Card className="lg:sticky lg:top-20">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="font-semibold text-foreground">Tu pedido</h2>
              {revalidando && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            <ul className="divide-y divide-border">
              {items.map((item) => {
                const excede = item.cantidad > item.stock
                return (
                  <li key={item.id} className="flex gap-3 p-4">
                    <ImagenProducto
                      src={item.imagen_url}
                      nombre={item.nombre}
                      className="h-12 w-12 flex-shrink-0 rounded"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{item.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.cantidad} × {formatCurrency(item.precio)}
                      </p>
                      {excede && (
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="destructive">
                            {item.stock > 0 ? `Solo ${item.stock}` : 'Sin stock'}
                          </Badge>
                          {item.stock > 0 ? (
                            <button
                              type="button"
                              onClick={() => cambiarCantidad(item.id, item.stock)}
                              className="text-xs font-medium text-primary hover:underline"
                            >
                              Ajustar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => quitar(item.id)}
                              className="text-xs font-medium text-destructive hover:underline"
                            >
                              Quitar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(item.precio * item.cantidad)}
                    </p>
                  </li>
                )
              })}
            </ul>

            <CardContent className="bg-muted/30 p-5">
              <div className="flex items-end justify-between border-t border-border pt-4">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-2xl font-bold leading-none text-foreground">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                El importe definitivo lo confirma el sistema con los precios vigentes.
              </p>

              {errors.items && (
                <p className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm font-medium text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {errors.items}
                </p>
              )}

              <Button type="submit" size="lg" className="mt-4 w-full" loading={enviando} disabled={revalidando}>
                <Lock className="h-4 w-4" /> Confirmar pedido
              </Button>

              {config?.whatsapp && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  ¿Dudas? Escríbenos al {config.whatsapp}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
