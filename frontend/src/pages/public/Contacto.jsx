/**
 * Página pública de contacto: los datos reales de la empresa y un formulario.
 *
 * Todos los datos salen de `GET /api/public/configuracion`, que ya trae el
 * layout. Cada bloque se dibuja SOLO si tiene contenido: si no hay WhatsApp
 * cargado no aparece el botón, y si no hay dirección no aparece la sección. Un
 * teléfono de ejemplo o un "próximamente" es peor que no mostrar nada — el
 * visitante llama a un número que no existe.
 *
 * El formulario se limpia únicamente cuando la API confirmó el envío: si se
 * limpiara al enviar, un corte de red le haría perder el texto escrito.
 */

import { useState } from 'react'
import {
  Mail, Phone, MapPin, Clock, MessageCircle, Send, CheckCircle2,
} from 'lucide-react'
import { publicoService, linkWhatsApp, linkTelefono, linkRed } from '@/services/publico.service.js'
import { useConfiguracionPublica } from '@/components/layout/PublicLayout.jsx'
import { notify } from '@/lib/toast.js'
import { Card, CardContent } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Input } from '@/components/ui/Input.jsx'
import { Textarea } from '@/components/ui/Textarea.jsx'
import { FormField } from '@/components/common/FormField.jsx'

const FORM_VACIO = { nombre: '', email: '', telefono: '', asunto: '', mensaje: '' }

/** Mínimo del mensaje; el backend aplica el mismo. */
const MIN_MENSAJE = 10

/** Bloque de dato de contacto. No se dibuja si no hay valor. */
function DatoContacto({ icon: Icon, titulo, valor, href, destacado = false }) {
  if (!valor) return null

  const contenido = (
    <div className="flex items-start gap-3.5">
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg ${
        destacado ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
      }`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{titulo}</p>
        <p className="break-words text-sm text-muted-foreground">{valor}</p>
      </div>
    </div>
  )

  // Con enlace, la tarjeta entera es el área clicable: en móvil un texto suelto
  // es un objetivo demasiado chico para el dedo.
  if (!href) {
    return <Card className="p-4">{contenido}</Card>
  }
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel="noopener noreferrer"
      className="block rounded-lg"
    >
      <Card className="p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card">
        {contenido}
      </Card>
    </a>
  )
}

export default function Contacto() {
  const config = useConfiguracionPublica()

  const [form, setForm] = useState(FORM_VACIO)
  const [errors, setErrors] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const set = (clave, valor) => setForm((f) => ({ ...f, [clave]: valor }))

  const whatsapp = linkWhatsApp(config?.whatsapp)
  const ubicacion = [config?.direccion, config?.ciudad, config?.provincia].filter(Boolean).join(', ')
  const redes = [
    ['Facebook', linkRed(config?.facebook, 'https://facebook.com')],
    ['Instagram', linkRed(config?.instagram, 'https://instagram.com')],
    ['X', linkRed(config?.twitter, 'https://x.com')],
    ['TikTok', linkRed(config?.tiktok, 'https://tiktok.com/@')],
  ].filter(([, url]) => Boolean(url))

  const hayDatos = Boolean(config?.email || config?.telefono || whatsapp || ubicacion || config?.horario_atencion)

  function validate() {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'Ingresa tu nombre'
    else if (form.nombre.trim().length < 2) e.nombre = 'El nombre es demasiado corto'

    if (!form.email.trim()) e.email = 'Ingresa tu correo'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'El correo no es válido'

    if (!form.mensaje.trim()) e.mensaje = 'Escribe tu consulta'
    else if (form.mensaje.trim().length < MIN_MENSAJE) {
      e.mensaje = `Cuéntanos un poco más (mínimo ${MIN_MENSAJE} caracteres)`
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  /** Traduce los errores del backend a los campos del formulario. */
  function aplicarErroresDelServidor(lista) {
    if (!Array.isArray(lista) || lista.length === 0) return false
    const mapeados = {}
    for (const { campo, mensaje } of lista) {
      if (campo in FORM_VACIO) mapeados[campo] = mensaje
    }
    setErrors(mapeados)
    return Object.keys(mapeados).length > 0
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    if (!validate()) return

    setEnviando(true)
    try {
      const confirmacion = await publicoService.enviarContacto({
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim(),
        asunto: form.asunto.trim(),
        mensaje: form.mensaje.trim(),
      })

      // Recién con la confirmación de la API se limpia lo que escribió.
      setForm(FORM_VACIO)
      setErrors({})
      setEnviado(true)
      notify.success(confirmacion || 'Recibimos tu mensaje')
    } catch (err) {
      if (!aplicarErroresDelServidor(err?.errors)) {
        // El 429 trae su propio mensaje ya redactado.
        notify.fromApiError(err, 'No pudimos enviar tu mensaje')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="container-site py-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Estamos para ayudarte</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground sm:text-4xl">Contacto</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Escríbenos por el medio que prefieras y te respondemos a la brevedad.
          </p>
        </div>
      </section>

      <div className="container-site grid grid-cols-1 gap-6 py-10 lg:grid-cols-3">
        {/* Datos de la empresa */}
        {hayDatos && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Nuestros datos
            </h2>
            {/* WhatsApp va destacado: es el canal por el que realmente se
                coordina, y el resto queda como alternativa. */}
            <DatoContacto
              icon={MessageCircle}
              titulo="WhatsApp"
              valor={config?.whatsapp}
              href={whatsapp || undefined}
              destacado
            />
            <DatoContacto
              icon={Phone}
              titulo="Teléfono"
              valor={config?.telefono}
              href={linkTelefono(config?.telefono) || undefined}
            />
            <DatoContacto
              icon={Mail}
              titulo="Correo"
              valor={config?.email}
              href={config?.email ? `mailto:${config.email}` : undefined}
            />
            <DatoContacto icon={MapPin} titulo="Dirección" valor={ubicacion} />
            <DatoContacto
              icon={Clock}
              titulo="Horario de atención"
              valor={config?.horario_atencion}
            />

            {redes.length > 0 && (
              <Card className="p-4">
                <p className="text-sm font-semibold text-foreground">Seguinos</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {redes.map(([label, url]) => (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      {label}
                    </a>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Formulario */}
        <div className={hayDatos ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <Card>
            <div className="border-b border-border p-5">
              <h2 className="font-semibold text-foreground">Envianos un mensaje</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Completa el formulario y nos comunicamos contigo.
              </p>
            </div>

            <CardContent className="p-5">
              {enviado && (
                <div className="mb-5 flex items-start gap-3 rounded-md border border-emerald-300 bg-emerald-50 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-sm font-medium text-emerald-900">Mensaje enviado</p>
                    <p className="text-sm text-emerald-800">
                      Gracias por escribirnos. Te vamos a responder a la brevedad.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Nombre" htmlFor="ct-nombre" required error={errors.nombre}>
                    <Input
                      id="ct-nombre"
                      value={form.nombre}
                      onChange={(e) => set('nombre', e.target.value)}
                      placeholder="Tu nombre"
                    />
                  </FormField>
                  <FormField label="Correo" htmlFor="ct-email" required error={errors.email}>
                    <Input
                      id="ct-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="tucorreo@ejemplo.com"
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Teléfono" htmlFor="ct-telefono" hint="Opcional" error={errors.telefono}>
                    <Input
                      id="ct-telefono"
                      value={form.telefono}
                      onChange={(e) => set('telefono', e.target.value)}
                      placeholder="998 268 132"
                    />
                  </FormField>
                  <FormField label="Asunto" htmlFor="ct-asunto" hint="Opcional" error={errors.asunto}>
                    <Input
                      id="ct-asunto"
                      value={form.asunto}
                      onChange={(e) => set('asunto', e.target.value)}
                      placeholder="Consulta por precios mayoristas"
                    />
                  </FormField>
                </div>

                <FormField
                  label="Mensaje"
                  htmlFor="ct-mensaje"
                  required
                  error={errors.mensaje}
                  hint={`Cuéntanos qué necesitas (mínimo ${MIN_MENSAJE} caracteres)`}
                >
                  <Textarea
                    id="ct-mensaje"
                    rows={5}
                    value={form.mensaje}
                    maxLength={4000}
                    onChange={(e) => set('mensaje', e.target.value)}
                    placeholder="Necesito cotizar vasos y servilletas para un evento de 200 personas..."
                  />
                </FormField>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Usamos tus datos solo para responderte esta consulta.
                  </p>
                  <Button type="submit" loading={enviando} className="sm:w-auto">
                    <Send className="h-4 w-4" /> Enviar mensaje
                  </Button>
                </div>
              </form>

              {whatsapp && (
                <p className="mt-5 border-t border-border pt-4 text-center text-sm text-muted-foreground">
                  ¿Prefieres algo más rápido?{' '}
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    Escríbenos por WhatsApp
                  </a>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
