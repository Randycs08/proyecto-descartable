/**
 * Lógica de negocio de clientes: normalización de los campos opcionales,
 * unicidad del documento, alta/baja lógica y reglas de borrado seguro.
 */

import * as clienteModel from '../models/cliente.model.js'
import { ApiError } from '../utils/ApiError.js'

// Se declaran acá y los validadores los importan, igual que en pedidos: el
// listado de tipos válidos existe UNA sola vez.
export const TIPOS_DOCUMENTO = ['DNI', 'CUIT', 'CUIL', 'RUC', 'PASAPORTE', 'OTRO']

/**
 * Los textos opcionales vacíos se guardan como NULL, no como ''.
 *
 * Importa por el UNIQUE (tipo_documento, documento): MySQL trata los NULL como
 * distintos entre sí, pero las cadenas vacías como iguales. Sin esto, el segundo
 * cliente sin documento chocaría contra el primero.
 */
function normalizarOpcionales(data) {
  const opcionales = [
    'apellido', 'razon_social', 'documento', 'email', 'telefono',
    'direccion', 'ciudad', 'provincia', 'codigo_postal',
  ]
  const limpio = { ...data }

  for (const campo of opcionales) {
    if (limpio[campo] === undefined) continue
    const valor = typeof limpio[campo] === 'string' ? limpio[campo].trim() : limpio[campo]
    limpio[campo] = valor === '' || valor === null ? null : valor
  }

  return limpio
}

/**
 * Verifica que el par (tipo_documento, documento) no esté tomado por otro
 * cliente. Sin documento no hay nada que comprobar: pueden coexistir varios.
 *
 * @param {string|null} documento
 * @param {string} tipoDocumento
 * @param {number|null} [ignoreId]  Id a excluir (al actualizar, el propio).
 */
async function assertDocumentoLibre(documento, tipoDocumento, ignoreId = null) {
  if (!documento) return

  const existente = await clienteModel.findByDocumento(documento, tipoDocumento)
  if (existente && existente.id !== Number(ignoreId)) {
    throw ApiError.conflict(
      `Ya existe un cliente con el ${tipoDocumento} ${documento}`
    )
  }
}

/** Lista paginada de clientes. */
export async function list(filters) {
  return clienteModel.findAll(filters)
}

/** Obtiene un cliente por id o lanza 404. */
export async function getById(id) {
  const cliente = await clienteModel.findById(id)
  if (!cliente) throw ApiError.notFound('Cliente no encontrado')
  return cliente
}

/** Obtiene un cliente por su documento o lanza 404. */
export async function getByDocumento(documento, tipoDocumento = null) {
  const cliente = await clienteModel.findByDocumento(documento, tipoDocumento)
  if (!cliente) throw ApiError.notFound('Cliente no encontrado')
  return cliente
}

/** Crea un cliente, validando que el documento no esté repetido. */
export async function create(data) {
  const payload = normalizarOpcionales(data)
  const tipoDocumento = payload.tipo_documento ?? 'DNI'

  await assertDocumentoLibre(payload.documento, tipoDocumento)

  return clienteModel.create({ ...payload, tipo_documento: tipoDocumento })
}

/**
 * Actualiza un cliente.
 * Si cambia el documento o su tipo, se vuelve a comprobar la unicidad.
 */
export async function update(id, data) {
  const actual = await getById(id) // garantiza que exista (404 si no)

  const payload = normalizarOpcionales(data)

  // El tipo efectivo es el que venga en la petición o, si no viene, el actual:
  // cambiar solo el número también tiene que validarse contra el par completo.
  const tipoDocumento = payload.tipo_documento ?? actual.tipo_documento
  const documento = payload.documento !== undefined ? payload.documento : actual.documento

  const cambioDocumento =
    documento !== actual.documento || tipoDocumento !== actual.tipo_documento

  if (cambioDocumento) {
    await assertDocumentoLibre(documento, tipoDocumento, id)
  }

  return clienteModel.update(id, payload)
}

/**
 * Activa o desactiva un cliente (baja lógica).
 *
 * Desactivar NO borra nada ni afecta a los pedidos ya registrados: solo impide
 * cargarle pedidos nuevos, porque el servicio de pedidos rechaza los clientes
 * inactivos.
 *
 * La operación es idempotente: pedir el estado que el cliente ya tiene devuelve
 * 200 sin cambios. A diferencia del estado de un pedido —que es una máquina de
 * estados donde repetir una transición delata un error del cliente— acá se trata
 * de un simple interruptor, y PATCH debe poder repetirse sin consecuencias.
 *
 * @param {number} id
 * @param {boolean} activo
 */
export async function setActivo(id, activo) {
  const cliente = await getById(id)

  if (Boolean(cliente.activo) === activo) return cliente

  return clienteModel.update(id, { activo })
}

/**
 * Elimina un cliente, solo si nunca se lo usó en un pedido.
 *
 * La FK `pedidos.cliente_id` es RESTRICT, así que MySQL ya lo impediría; se
 * comprueba antes para devolver un mensaje entendible y con el conteo, igual
 * que hace categorías con sus productos.
 *
 * Para clientes que ya operaron, la baja correcta es desactivarlos
 * (`setActivo`), no borrarlos: sus pedidos deben conservar a quién se
 * facturaron.
 */
export async function remove(id) {
  await getById(id)

  const pedidos = await clienteModel.countPedidos(id)
  if (pedidos > 0) {
    throw ApiError.conflict(
      `No se puede eliminar: el cliente tiene ${pedidos} pedido(s) asociado(s). ` +
      'Si ya no opera con él, desactívalo en lugar de borrarlo'
    )
  }

  await clienteModel.remove(id)
}
