/**
 * API del sitio público. Se usa esta y no la del panel porque `/api/productos`
 * devuelve el costo y el proveedor, que no deben llegar al navegador de un
 * visitante.
 */

import { api } from './api.js'

export const publicoService = {
  /** GET /public/productos -> { data, meta } */
  async listProductos(params = {}) {
    const { data } = await api.get('/public/productos', { params })
    return { data: data.data, meta: data.meta }
  },

  /** GET /public/productos/:slug — ficha del producto (404 si no es publicable). */
  async getProducto(slug) {
    const { data } = await api.get(`/public/productos/${encodeURIComponent(slug)}`)
    return data.data
  },

  /**
   * GET /public/categorias — categorías activas con su cantidad de productos.
   * @param {boolean} [conProductos]  Omite las categorías vacías.
   */
  async listCategorias(conProductos = false) {
    const { data } = await api.get('/public/categorias', {
      params: conProductos ? { conProductos: true } : undefined,
    })
    return data.data
  },

  /** GET /public/configuracion — datos de contacto para el encabezado y el pie. */
  async getConfiguracion() {
    const { data } = await api.get('/public/configuracion')
    return data.data
  },

  /**
   * POST /public/checkout. Del carrito viajan solo `producto_id` y `cantidad`:
   * los importes los calcula el servidor.
   *
   * `clave` identifica el INTENTO de compra. Si el mismo intento se envía dos
   * veces —doble clic, reintento del navegador, dos pestañas— el servidor
   * devuelve el pedido de la primera en vez de crear otro.
   */
  async crearPedido(payload, clave) {
    const { data } = await api.post('/public/checkout', payload, {
      headers: { 'Idempotency-Key': clave },
    })
    return data.data
  },

  /** POST /public/contacto. Devuelve solo el texto de confirmación. */
  async enviarContacto(payload) {
    const { data } = await api.post('/public/contacto', payload)
    return data.message
  },
}

/**
 * Genera la clave de un intento de compra para la cabecera `Idempotency-Key`.
 *
 * `randomUUID` solo existe en contexto seguro (https o localhost), así que en un
 * despliegue por http hay que armarla a mano. `getRandomValues` sí está siempre,
 * y 16 bytes al azar no chocan en la práctica.
 */
export function nuevaClaveIntento() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()

  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Formas de pago que ofrece el sitio (coinciden con el backend). */
export const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo contra entrega' },
  { value: 'transferencia', label: 'Transferencia bancaria' },
  { value: 'yape', label: 'Yape' },
  { value: 'plin', label: 'Plin' },
]

/** Tipos de documento aceptados en el checkout. */
export const TIPOS_DOCUMENTO = ['DNI', 'RUC', 'CUIT', 'CUIL', 'PASAPORTE', 'OTRO']

/** Opciones del selector de orden del catálogo (coinciden con el backend). */
export const ORDENES = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'nombre', label: 'Nombre (A-Z)' },
  { value: 'nombre_desc', label: 'Nombre (Z-A)' },
  { value: 'precio', label: 'Precio: menor a mayor' },
  { value: 'precio_desc', label: 'Precio: mayor a menor' },
]

/** Mensaje con el que se abre la conversación si no se indica otro. */
export const MENSAJE_WHATSAPP = 'Hola, quisiera consultar por sus productos'

// El número se guarda y se muestra en formato local ("998 268 132"); el prefijo
// se agrega al armar el enlace, que es donde hace falta.
const PREFIJO_PAIS = '51'
const LARGO_LOCAL = 9

// Por debajo de esto no es un número, es un marcador a medio cargar. Pasó con
// "+51 XXX XXX XXX", que dejaba "51" y armaba un wa.me/51 roto.
const MIN_DIGITOS = 8

/** Pasa un número al formato internacional que necesitan `wa.me` y `tel:`. */
function aFormatoInternacional(valor) {
  if (!valor) return null

  let numero = String(valor).replace(/\D/g, '')
  if (numero.length === LARGO_LOCAL) numero = `${PREFIJO_PAIS}${numero}`
  if (numero.length < MIN_DIGITOS) return null

  return numero
}

/**
 * Arma el enlace de WhatsApp. Único lugar donde se construye, así que el número
 * sale siempre de la configuración. Devuelve null si no hay número válido, y
 * quien lo llama oculta el botón.
 */
export function linkWhatsApp(whatsapp, mensaje = MENSAJE_WHATSAPP) {
  const numero = aFormatoInternacional(whatsapp)
  if (!numero) return null

  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}

/** Enlace de llamada. Con "+" y prefijo, para que funcione desde el exterior. */
export function linkTelefono(telefono) {
  const numero = aFormatoInternacional(telefono)
  return numero ? `tel:+${numero}` : null
}

/**
 * Normaliza una red social cargada como usuario ("@tienda") o como URL.
 *
 * PROVISIONAL: la configuración apunta a la página principal de cada plataforma
 * hasta que el negocio entregue sus cuentas. Se cargan desde el panel.
 */
export function linkRed(valor, base) {
  if (!valor) return null
  if (/^https?:\/\//i.test(valor)) return valor
  return `${base}/${String(valor).replace(/^@/, '')}`
}
