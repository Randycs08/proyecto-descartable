/**
 * Compra desde el sitio público. Es el único punto de la API donde alguien sin
 * sesión escribe en la base, así que del visitante se acepta QUÉ quiere comprar
 * y A QUIÉN facturárselo, nunca cuánto cuesta: precio, total, estado y usuario
 * ni siquiera se leen del cuerpo.
 *
 * Todo ocurre en una transacción (reserva de la clave, cliente, cabecera,
 * detalle, stock y movimientos): si algo falla no queda nada a medias.
 *
 * IDEMPOTENCIA
 *
 * Cada intento de compra viaja con una clave propia (cabecera Idempotency-Key).
 * Un doble clic, un reintento del navegador o dos pestañas abiertas mandan la
 * MISMA clave, y eso debe terminar en UN pedido y UN descuento de stock. Con
 * eso alcanza: la protección no depende de que el botón se deshabilite.
 *
 * La clave se reserva en `checkout_idempotencia` como primera operación de la
 * transacción, antes de tocar clientes o stock. La PRIMARY KEY hace el trabajo:
 *
 *   - Solicitud repetida, la primera ya terminada -> ni se abre la transacción,
 *     se devuelve el pedido original.
 *   - Solicitudes a la vez -> la segunda queda bloqueada en el INSERT hasta que
 *     la primera cierre. Si confirmó, recibe ER_DUP_ENTRY y devuelve el pedido
 *     de la primera; si revirtió, la reserva desapareció y sigue normalmente.
 *
 * Es decir, una clave "quemada" solo existe si hay un pedido detrás. Un intento
 * fallido —falta de stock, datos inválidos— siempre se puede reintentar con la
 * misma clave.
 */

import * as pedidoService from './pedido.service.js'
import * as clienteModel from '../models/cliente.model.js'
import * as idempotenciaModel from '../models/checkoutIdempotencia.model.js'
import { ApiError } from '../utils/ApiError.js'

/**
 * Formas de pago del sitio. Son informativas: aquí no se cobra nada.
 * Es un subconjunto del ENUM; tarjeta, mercadopago y cuenta_corriente son
 * exclusivos del panel.
 */
export const METODOS_PAGO_PUBLICOS = ['efectivo', 'transferencia', 'yape', 'plin']

/** Cadena vacía o solo espacios -> null (el schema distingue NULL de ''). */
const limpiar = (valor) => {
  if (valor === undefined || valor === null) return null
  const texto = String(valor).trim()
  return texto === '' ? null : texto
}

/**
 * Traduce el formulario a una fila de `clientes`. El distrito va a `ciudad`; la
 * referencia es de la entrega, no del cliente, así que viaja en el pedido.
 */
function aCliente(datos) {
  return {
    nombre: limpiar(datos.nombre),
    apellido: limpiar(datos.apellido),
    razon_social: datos.tipo === 'empresa' ? limpiar(datos.razon_social) : null,
    tipo_documento: datos.tipo_documento,
    documento: limpiar(datos.documento),
    email: limpiar(datos.email),
    telefono: limpiar(datos.telefono),
    direccion: limpiar(datos.direccion),
    ciudad: limpiar(datos.distrito),
    activo: true,
  }
}

/**
 * Devuelve el id del cliente, creándolo si hace falta. Se identifica por
 * (tipo_documento, documento).
 *
 * Si ya existe NO se pisan sus datos: el panel manda sobre la ficha del cliente
 * y una compra no debería reescribir a distancia lo que un empleado corrigió.
 * Un cliente dado de baja no puede comprar.
 */
async function resolverCliente(conn, datos) {
  const documento = limpiar(datos.documento)

  const existente = await clienteModel.findByDocumento(documento, datos.tipo_documento, conn)

  if (existente) {
    if (!existente.activo) {
      throw ApiError.badRequest(
        'No podemos procesar el pedido con ese documento. Escríbenos y lo resolvemos.'
      )
    }
    return existente.id
  }

  const creado = await clienteModel.create(aCliente(datos), conn)
  return creado.id
}

/** Notas del pedido: de dónde vino y lo que haya escrito el cliente. */
function armarNotas(datos) {
  const notas = limpiar(datos.notas)
  return notas ? `[Pedido web] · ${notas}` : '[Pedido web]'
}

/** Proyección pública del pedido: la confirmación que ve el comprador. */
function aPedidoPublico(pedido) {
  return {
    numero: pedido.numero,
    estado: pedido.estado,
    fecha_pedido: pedido.fecha_pedido,
    metodo_pago: pedido.metodo_pago,
    estado_pago: pedido.estado_pago,
    cliente_nombre: pedido.cliente_nombre,
    direccion_entrega: pedido.direccion_entrega,
    distrito: pedido.distrito,
    referencia_entrega: pedido.referencia_entrega,
    subtotal: pedido.subtotal,
    total: pedido.total,
    detalle: (pedido.detalle ?? []).map((linea) => ({
      descripcion: linea.descripcion,
      cantidad: linea.cantidad,
      precio_unitario: linea.precio_unitario,
      subtotal: linea.subtotal,
    })),
  }
}

/**
 * Confirmación del pedido que ya se registró con esta clave, o null si la clave
 * está libre.
 *
 * Una reserva sin `pedido_id` no se toma como usada: una transacción en curso no
 * es visible desde afuera, así que ese NULL solo podría venir de una fila
 * huérfana, y frenar la compra por eso sería peor que dejarla seguir.
 */
async function pedidoDeLaClave(clave) {
  const reserva = await idempotenciaModel.findByClave(clave)
  if (!reserva?.pedido_id) return null

  const pedido = await pedidoService.getById(reserva.pedido_id)
  return aPedidoPublico(pedido)
}

/**
 * Registra un pedido del sitio público. Cualquier clave de más se ignora.
 *
 * @param {object} datos  Comprador, items, método de pago y notas.
 * @param {string} clave  Clave de idempotencia del intento (obligatoria).
 * @returns {Promise<{ pedido: object, repetido: boolean }>}
 *   `repetido` indica que este envío no creó nada y se está devolviendo el
 *   pedido de un intento anterior con la misma clave.
 */
export async function crearPedido(datos, clave) {
  if (!METODOS_PAGO_PUBLICOS.includes(datos.metodo_pago)) {
    // Los validadores ya lo filtran; esto cubre una llamada interna equivocada.
    throw ApiError.unprocessable('El método de pago indicado no está disponible')
  }
  if (!clave) {
    throw ApiError.unprocessable('Falta la clave de idempotencia del pedido')
  }

  // Atajo del reintento secuencial: si la clave ya tiene pedido, se responde sin
  // abrir una transacción que igual iba a chocar contra la PRIMARY KEY.
  const anterior = await pedidoDeLaClave(clave)
  if (anterior) return { pedido: anterior, repetido: true }

  const cliente = datos.cliente

  // Solo producto y cantidad: el precio lo pone el catálogo, no el navegador.
  const detalle = datos.items.map((item) => ({
    producto_id: item.producto_id,
    cantidad: item.cantidad,
  }))

  try {
    const pedido = await pedidoService.create(
      {
        detalle,
        metodo_pago: datos.metodo_pago,
        // Cada dato en su columna, para poder listar por distrito sin partir cadenas.
        direccion_entrega: limpiar(cliente.direccion),
        distrito: limpiar(cliente.distrito),
        referencia_entrega: limpiar(cliente.referencia),
        notas: armarNotas(datos),
        // Sin `estado` ni `estado_pago`: el schema los deja en 'pendiente'.
        // Sin `descuento` ni `impuestos`: no se aceptan desde el sitio público.
      },
      null, // ningún usuario del panel registró este pedido
      {
        alAbrir: (conn) => idempotenciaModel.reservar(clave, conn),
        resolverCliente: (conn) => resolverCliente(conn, cliente),
        alCrear: (conn, pedidoId) => idempotenciaModel.asignarPedido(clave, pedidoId, conn),
      }
    )

    return { pedido: aPedidoPublico(pedido), repetido: false }
  } catch (error) {
    // Perdimos la carrera: otra solicitud con esta misma clave reservó primero y
    // ya confirmó. No es un error para quien compra, es su propio pedido.
    if (error?.code === 'ER_DUP_ENTRY') {
      const ganador = await pedidoDeLaClave(clave)
      if (ganador) return { pedido: ganador, repetido: true }
    }
    // Cualquier otro choque de índice (el documento del cliente, por ejemplo)
    // sigue siendo un error real y se propaga tal cual.
    throw error
  }
}
