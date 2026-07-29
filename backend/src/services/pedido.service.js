/**
 * Lógica de negocio de pedidos: numeración, importes, máquina de estados y stock.
 *
 * El stock se descuenta al CREAR el pedido y se repone al cancelarlo. Los
 * cambios de estado intermedios no lo tocan.
 */

import { withTransaction } from '../config/db.js'
import * as pedidoModel from '../models/pedido.model.js'
import * as detalleModel from '../models/detallePedido.model.js'
import * as clienteModel from '../models/cliente.model.js'
import * as productoModel from '../models/producto.model.js'
import * as movimientoModel from '../models/movimientoInventario.model.js'
import { ApiError } from '../utils/ApiError.js'
// El día del número de pedido sale de la zona del negocio, no de la del
// servidor: desplegado en un servidor UTC, el correlativo de la tarde saltaría
// al día siguiente.
import { fechaCompacta } from '../utils/fechas.js'

// Los ENUM del schema viven aquí y los validadores los importan, para no
// repetirlos en dos archivos.
export const ESTADOS_PEDIDO = [
  'pendiente', 'confirmado', 'en_proceso', 'enviado', 'entregado', 'cancelado',
]

// 'yape' y 'plin' van al final: MySQL guarda los ENUM por posición e
// intercalarlos cambiaría el método de los pedidos ya cargados.
export const METODOS_PAGO = [
  'efectivo', 'transferencia', 'tarjeta', 'mercadopago', 'cuenta_corriente',
  'otro', 'yape', 'plin',
]

export const ESTADOS_PAGO = ['pendiente', 'parcial', 'pagado', 'reembolsado']

/**
 * Transiciones permitidas. Un pedido avanza, no retrocede.
 * Un pedido ya enviado no se cancela: se gestiona como devolución.
 */
const TRANSICIONES = {
  pendiente: ['confirmado', 'en_proceso', 'cancelado'],
  confirmado: ['en_proceso', 'enviado', 'cancelado'],
  en_proceso: ['enviado', 'cancelado'],
  enviado: ['entregado'],
  entregado: [],
  cancelado: [],
}

/** Redondea a 2 decimales para no arrastrar errores de coma flotante. */
const redondear = (valor) => Math.round((Number(valor) + Number.EPSILON) * 100) / 100

/** Reintentos del alta ante choques de numeración entre pedidos simultáneos. */
const MAX_INTENTOS_NUMERO = 10

/**
 * Genera el próximo número de pedido: PED-AAAAMMDD-NNNN.
 *
 * Dos altas simultáneas pueden elegir el mismo número (entre el SELECT y el
 * INSERT no hay bloqueo); el índice UNIQUE lo corta y el reintento de
 * `insertarConNumeroUnico` lo resuelve.
 *
 * OJO: no usar SELECT ... FOR UPDATE sobre el rango. Se probó y los gap locks
 * chocan con los INSERT concurrentes -> ER_LOCK_DEADLOCK.
 */
async function buildNumeroPedido(executor) {
  const prefijo = `PED-${fechaCompacta()}-`
  const ultimo = await pedidoModel.findUltimoNumero(prefijo, executor)

  let secuencia = ultimo ? Number.parseInt(ultimo.slice(prefijo.length), 10) + 1 : 1

  // Reintenta hasta encontrar un número libre.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const numero = `${prefijo}${String(secuencia).padStart(4, '0')}`
    const existente = await pedidoModel.findByNumero(numero, executor)
    if (!existente) return numero
    secuencia += 1
  }
}

/**
 * ¿El error es un choque entre altas simultáneas y no un problema de datos?
 *
 * Solo el UNIQUE de `numero` se reintenta. Los otros índices únicos que puede
 * tocar el alta (la clave de idempotencia del checkout, el documento del
 * cliente) señalan algo que reintentar no arregla, así que deben salir para que
 * los resuelva quien llamó.
 *
 * Se compara contra el NOMBRE DEL ÍNDICE y no contra el mensaje entero: el
 * mensaje incluye el valor duplicado, y una clave de idempotencia que
 * casualmente contuviera "numero" habría disparado diez reintentos inútiles.
 */
const INDICE_NUMERO = /for key\s+'[^']*uq_pedidos_numero'/i

function esChoqueDeConcurrencia(error) {
  if (error?.code === 'ER_DUP_ENTRY') return INDICE_NUMERO.test(error.sqlMessage ?? '')
  return error?.code === 'ER_LOCK_DEADLOCK' || error?.code === 'ER_LOCK_WAIT_TIMEOUT'
}

/**
 * Abre la transacción del alta y la reintenta si choca con otra simultánea.
 * Cada reintento abre una transacción nueva; la anterior quedó revertida entera,
 * así que no hay riesgo de descontar stock dos veces.
 */
async function insertarConNumeroUnico(construir, alAbrir) {
  for (let intento = 1; ; intento++) {
    try {
      return await withTransaction(async (conn) => {
        // Antes que nada, ni siquiera de leer el último número: es el punto donde
        // el checkout reserva su clave y donde una solicitud repetida se frena.
        if (alAbrir) await alAbrir(conn)

        const numero = await buildNumeroPedido(conn)
        return construir(conn, numero)
      })
    } catch (error) {
      if (esChoqueDeConcurrencia(error) && intento < MAX_INTENTOS_NUMERO) continue
      throw error
    }
  }
}

/** Verifica que el cliente exista (FK) y esté activo. */
async function assertCliente(clienteId) {
  const cliente = await clienteModel.findById(clienteId)
  if (!cliente) throw ApiError.badRequest('El cliente indicado no existe')
  if (!cliente.activo) throw ApiError.badRequest('El cliente indicado está inactivo')
  return cliente
}

/**
 * Arma las líneas del detalle copiando nombre y precio del catálogo.
 * El precio NUNCA se toma del cuerpo de la petición.
 */
async function construirLineas(lineas) {
  // UNIQUE (pedido_id, producto_id): mejor avisar con un mensaje claro que
  // dejar reventar el índice con un 409 genérico.
  const vistos = new Set()
  for (const linea of lineas) {
    if (vistos.has(linea.producto_id)) {
      throw ApiError.unprocessable(
        `El producto ${linea.producto_id} está repetido en el detalle; suma las cantidades en una sola línea`
      )
    }
    vistos.add(linea.producto_id)
  }

  const construidas = []

  for (const linea of lineas) {
    const producto = await productoModel.findById(linea.producto_id)
    if (!producto) {
      throw ApiError.badRequest(`El producto ${linea.producto_id} no existe`)
    }
    if (!producto.activo) {
      throw ApiError.badRequest(`El producto "${producto.nombre}" no está activo`)
    }

    const precioUnitario = redondear(producto.precio)
    const descuento = redondear(linea.descuento ?? 0)
    const subtotal = redondear(linea.cantidad * precioUnitario - descuento)

    if (subtotal < 0) {
      throw ApiError.unprocessable(
        `El descuento de la línea "${producto.nombre}" supera el importe de la línea`
      )
    }

    construidas.push({
      producto_id: producto.id,
      descripcion: producto.nombre, // nombre al momento de la venta
      cantidad: linea.cantidad,
      precio_unitario: precioUnitario,
      descuento,
      subtotal,
    })
  }

  return construidas
}

/** Adjunta el detalle a la cabecera para devolver el pedido completo. */
async function conDetalle(pedido) {
  const detalle = await detalleModel.findByPedido(pedido.id)
  return { ...pedido, detalle }
}

/**
 * Única función que toca el stock: 'salida' al crear el pedido, 'entrada' al
 * cancelarlo. DEBE llamarse dentro de una transacción.
 *
 * Las líneas se ordenan por `producto_id` para que dos pedidos que compartan
 * productos los bloqueen siempre en la misma secuencia y no se traben entre sí.
 */
async function moverStock(conn, { lineas, tipo, pedidoId, motivo, usuarioId }) {
  const ordenadas = [...lineas].sort((a, b) => a.producto_id - b.producto_id)
  const movimientos = []

  for (const linea of ordenadas) {
    // Con bloqueo: el stock que se lee es el que se va a descontar.
    const producto = await productoModel.findByIdForUpdate(linea.producto_id, conn)
    if (!producto) {
      throw ApiError.badRequest(`El producto ${linea.producto_id} no existe`)
    }

    const stockAnterior = producto.stock
    const stockNuevo = tipo === 'salida'
      ? stockAnterior - linea.cantidad
      : stockAnterior + linea.cantidad

    if (stockNuevo < 0) {
      throw ApiError.conflict(
        `Stock insuficiente de "${producto.nombre}" (${producto.sku}): ` +
        `hay ${stockAnterior} y se necesitan ${linea.cantidad}`
      )
    }

    await productoModel.adjustStock(
      producto.id,
      tipo === 'salida' ? -linea.cantidad : linea.cantidad,
      conn
    )

    movimientos.push({
      producto_id: producto.id,
      tipo,
      cantidad: linea.cantidad, // siempre positiva; la dirección la da `tipo`
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
      motivo,
      pedido_id: pedidoId,
      usuario_id: usuarioId,
    })
  }

  await movimientoModel.createMany(movimientos, conn)
  return movimientos
}

/** Lista pedidos con filtros y paginación, sin el detalle. */
export async function list(filters) {
  return pedidoModel.findAll(filters)
}

/** Obtiene un pedido por id, con su detalle, o lanza 404. */
export async function getById(id) {
  const pedido = await pedidoModel.findById(id)
  if (!pedido) throw ApiError.notFound('Pedido no encontrado')
  return conDetalle(pedido)
}

/** Obtiene un pedido por su número, con su detalle, o lanza 404. */
export async function getByNumero(numero) {
  const pedido = await pedidoModel.findByNumero(numero)
  if (!pedido) throw ApiError.notFound('Pedido no encontrado')
  return conDetalle(pedido)
}

/**
 * Crea un pedido con su detalle y descuenta el stock: todo o nada.
 *
 * Los importes se calculan aquí; lo que el cliente mande como subtotal o total
 * se ignora. Las validaciones que no escriben se hacen ANTES de abrir la
 * transacción, para no mantener bloqueos mientras se resuelve algo que puede
 * rechazarse sin tocar la base.
 *
 * Tres puntos de enganche opcionales, todos dentro de la transacción, para que
 * el checkout público sume lo suyo sin que este servicio sepa de qué se trata:
 *
 *   - `alAbrir(conn)`      : lo primero que corre, antes de leer o escribir
 *                            nada. El checkout reserva ahí su clave de
 *                            idempotencia, para bloquear a una segunda
 *                            solicitud ANTES de que llegue a tocar el stock.
 *   - `resolverCliente(conn)`: da de alta al comprador en la misma transacción,
 *                            así no queda un cliente suelto si después falla el
 *                            stock.
 *   - `alCrear(conn, id)`  : con el pedido ya insertado y antes de confirmar.
 *
 * Si la transacción se reintenta por un choque de numeración, los tres vuelven
 * a ejecutarse: el intento anterior quedó revertido entero.
 */
export async function create(data, usuarioId = null, { resolverCliente, alAbrir, alCrear } = {}) {
  if (!resolverCliente) await assertCliente(data.cliente_id)

  const lineas = await construirLineas(data.detalle)

  const subtotal = redondear(lineas.reduce((acumulado, l) => acumulado + l.subtotal, 0))
  const descuento = redondear(data.descuento ?? 0)
  const impuestos = redondear(data.impuestos ?? 0)
  const total = redondear(subtotal - descuento + impuestos)

  // La tabla tiene CHECK (total >= 0): mejor avisar antes.
  if (total < 0) {
    throw ApiError.unprocessable(
      'El descuento no puede superar el subtotal del pedido'
    )
  }

  const pedidoId = await insertarConNumeroUnico(async (conn, numero) => {
    const clienteId = resolverCliente ? await resolverCliente(conn) : data.cliente_id

    const id = await pedidoModel.create({
      numero,
      cliente_id: clienteId,
      usuario_id: usuarioId,
      metodo_pago: data.metodo_pago,
      estado_pago: data.estado_pago,
      subtotal,
      descuento,
      impuestos,
      total,
      direccion_entrega: data.direccion_entrega,
      distrito: data.distrito,
      referencia_entrega: data.referencia_entrega,
      notas: data.notas,
    }, conn)

    await detalleModel.createMany(id, lineas, conn)

    await moverStock(conn, {
      lineas,
      tipo: 'salida',
      pedidoId: id,
      motivo: `Venta - pedido ${numero}`,
      usuarioId,
    })

    if (alCrear) await alCrear(conn, id)

    return id
  }, alAbrir)

  return getById(pedidoId)
}

/** Cambia el estado de un pedido respetando la máquina de estados. */
export async function updateEstado(id, estado) {
  // Cancelar devuelve el stock reservado, así que se delega en `cancel()`: un
  // solo camino hacia "cancelado". Si no, este atajo no repondría el inventario.
  if (estado === 'cancelado') return cancel(id)

  const pedido = await getById(id)

  if (pedido.estado === estado) {
    throw ApiError.conflict(`El pedido ya se encuentra en estado "${estado}"`)
  }

  const permitidos = TRANSICIONES[pedido.estado] ?? []
  if (!permitidos.includes(estado)) {
    throw ApiError.conflict(
      permitidos.length
        ? `No se puede pasar de "${pedido.estado}" a "${estado}". Estados posibles: ${permitidos.join(', ')}`
        : `El pedido está "${pedido.estado}" y ya no admite cambios de estado`
    )
  }

  await pedidoModel.update(id, { estado })
  return getById(id)
}

/**
 * Cancela un pedido y devuelve al stock las unidades reservadas.
 * Todo en una transacción: o se cancela y se repone, o no pasa nada.
 */
export async function cancel(id, motivo) {
  const pedido = await getById(id)

  if (pedido.estado === 'cancelado') {
    throw ApiError.conflict('El pedido ya está cancelado')
  }
  if (!TRANSICIONES[pedido.estado]?.includes('cancelado')) {
    throw ApiError.conflict(
      `No se puede cancelar un pedido en estado "${pedido.estado}"`
    )
  }

  const cambios = { estado: 'cancelado' }

  // El motivo se agrega a las notas en lugar de pisarlas.
  if (motivo) {
    const anotacion = `[Cancelado] ${motivo}`
    cambios.notas = pedido.notas ? `${pedido.notas}\n${anotacion}` : anotacion
  }

  await withTransaction(async (conn) => {
    // Se relee con bloqueo y se revisa el estado otra vez: sin esto, dos
    // cancelaciones simultáneas repondrían el stock dos veces.
    const actual = await pedidoModel.findByIdForUpdate(id, conn)
    if (!actual) throw ApiError.notFound('Pedido no encontrado')
    if (actual.estado === 'cancelado') {
      throw ApiError.conflict('El pedido ya está cancelado')
    }

    await pedidoModel.update(id, cambios, conn)

    await moverStock(conn, {
      lineas: pedido.detalle,
      tipo: 'entrada',
      pedidoId: id,
      motivo: `Cancelación - pedido ${pedido.numero}`,
      usuarioId: pedido.usuario_id,
    })
  })

  return getById(id)
}
