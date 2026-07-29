/**
 * Módulo de pedidos. A diferencia de categorías y productos, NINGUNA ruta es
 * pública: un pedido contiene datos del cliente e importes, así que todas exigen
 * JWT.
 *
 * Roles:
 *   - OPERADORES: consultan, cargan y avanzan pedidos (incluye al vendedor,
 *     cuyo rol en el seed es justamente "Registro de pedidos y atención de
 *     clientes").
 *   - GESTORES: además pueden cancelar, que es la acción irreversible.
 *
 * Cancelar tiene DOS puertas de entrada, y las dos exigen rol de gestor:
 * `POST /:id/cancelar` y `PATCH /:id/estado` con estado "cancelado", que el
 * servicio deriva a la misma función. Ver `autorizarCancelacion` más abajo.
 */

import { Router } from 'express'
import * as pedidoController from '../controllers/pedido.controller.js'
import {
  listPedidosRules,
  createPedidoRules,
  updateEstadoRules,
  cancelPedidoRules,
  idParamRule,
  numeroParamRule,
} from '../validators/pedido.validators.js'
import { validate } from '../middlewares/validate.middleware.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'

const router = Router()

const OPERADORES = ['Administrador', 'Empleado', 'Vendedor']
const GESTORES = ['Administrador', 'Empleado']

/**
 * Exige rol de GESTOR únicamente cuando la petición pide cancelar.
 *
 * `PATCH /:id/estado` acepta a todos los OPERADORES porque avanzar un pedido es
 * tarea del vendedor. Pero `pedidoService.updateEstado()` deriva en `cancel()`
 * cuando el estado solicitado es "cancelado", de modo que sin este control esa
 * ruta se convierte en un atajo para hacer lo que `POST /:id/cancelar` reserva a
 * los gestores: dar de baja el pedido y devolver el stock al inventario.
 *
 * La condición es EXACTAMENTE la misma que dispara la derivación en el servicio
 * (`estado === 'cancelado'`), así que el permiso se pide siempre que —y solo
 * cuando— se vaya a cancelar. El resto de las transiciones no se ve afectado.
 *
 * Se apoya en `authorize` en lugar de comparar roles a mano: la lista de roles y
 * el formato del 403 siguen definiéndose en un solo lugar.
 */
const autorizarCancelacion = (req, res, next) =>
  req.body?.estado === 'cancelado'
    ? authorize(...GESTORES)(req, res, next)
    : next()

/**
 * @openapi
 * /api/pedidos:
 *   get:
 *     tags: [Pedidos]
 *     summary: Listar pedidos
 *     description: Listado paginado. Se puede buscar por número y filtrar por estado.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Busca por número de pedido (coincidencia parcial)
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [pendiente, confirmado, en_proceso, enviado, entregado, cancelado]
 *       - in: query
 *         name: clienteId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Listado paginado de pedidos (sin el detalle)
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Pedido' }
 *                     meta: { $ref: '#/components/schemas/Paginacion' }
 *       401: { description: No autenticado }
 *       403: { description: Sin permisos }
 */
router.get(
  '/',
  authenticate,
  authorize(...OPERADORES),
  listPedidosRules,
  validate,
  pedidoController.listPedidos
)

/**
 * @openapi
 * /api/pedidos/numero/{numero}:
 *   get:
 *     tags: [Pedidos]
 *     summary: Obtener un pedido por su número
 *     description: Búsqueda exacta. Devuelve el pedido con su detalle.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: numero
 *         required: true
 *         schema: { type: string }
 *         example: PED-20260727-0001
 *     responses:
 *       200:
 *         description: Pedido encontrado
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/PedidoConDetalle' }
 *       404:
 *         description: No encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RespuestaError' }
 */
// Va antes que /:id por claridad; no hay ambigüedad porque tiene dos segmentos.
router.get(
  '/numero/:numero',
  authenticate,
  authorize(...OPERADORES),
  numeroParamRule,
  validate,
  pedidoController.getPedidoPorNumero
)

/**
 * @openapi
 * /api/pedidos/{id}:
 *   get:
 *     tags: [Pedidos]
 *     summary: Obtener un pedido por id
 *     description: Devuelve la cabecera junto con todas sus líneas de detalle.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Pedido encontrado
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/PedidoConDetalle' }
 *       404:
 *         description: No encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RespuestaError' }
 */
router.get(
  '/:id',
  authenticate,
  authorize(...OPERADORES),
  idParamRule,
  validate,
  pedidoController.getPedido
)

/**
 * @openapi
 * /api/pedidos:
 *   post:
 *     tags: [Pedidos]
 *     summary: Crear pedido
 *     description: >
 *       Crea la cabecera y sus líneas. Los precios NO se toman del cuerpo de la
 *       petición: se copian del catálogo al momento de la venta. El subtotal, el
 *       total y el número de pedido los calcula el servidor.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cliente_id, detalle]
 *             properties:
 *               cliente_id:        { type: integer, example: 1 }
 *               metodo_pago:
 *                 type: string
 *                 enum: [efectivo, transferencia, tarjeta, mercadopago, cuenta_corriente, otro, yape, plin]
 *               estado_pago:
 *                 type: string
 *                 enum: [pendiente, parcial, pagado, reembolsado]
 *               descuento:         { type: number, example: 500.00, description: Descuento sobre el total }
 *               impuestos:         { type: number, example: 0.00 }
 *               direccion_entrega:  { type: string, maxLength: 255, example: Av. Arequipa 1234 }
 *               distrito:           { type: string, maxLength: 100, example: Miraflores }
 *               referencia_entrega: { type: string, maxLength: 255, example: Frente al parque }
 *               notas:             { type: string }
 *               detalle:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [producto_id, cantidad]
 *                   properties:
 *                     producto_id: { type: integer, example: 1 }
 *                     cantidad:    { type: integer, example: 10 }
 *                     descuento:   { type: number, example: 0.00, description: Descuento de esa línea }
 *     responses:
 *       201:
 *         description: Pedido creado
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/PedidoConDetalle' }
 *       400: { description: Cliente o producto inexistente o inactivo }
 *       401: { description: No autenticado }
 *       403: { description: Sin permisos }
 *       422: { description: Errores de validación }
 */
router.post(
  '/',
  authenticate,
  authorize(...OPERADORES),
  createPedidoRules,
  validate,
  pedidoController.createPedido
)

/**
 * @openapi
 * /api/pedidos/{id}/estado:
 *   patch:
 *     tags: [Pedidos]
 *     summary: Actualizar el estado de un pedido
 *     description: >
 *       Avanza el pedido respetando su ciclo de vida:
 *       pendiente → confirmado → en_proceso → enviado → entregado.
 *       Se puede cancelar desde cualquier estado previo al envío.
 *       `entregado` y `cancelado` son terminales.
 *
 *
 *       Disponible para Administrador, Empleado y Vendedor, con una excepción:
 *       enviar `cancelado` equivale a `POST /api/pedidos/{id}/cancelar` (da de
 *       baja el pedido y repone el stock), así que exige rol Administrador o
 *       Empleado. Un Vendedor recibe 403 y el pedido no se modifica.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estado]
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [pendiente, confirmado, en_proceso, enviado, entregado, cancelado]
 *                 example: confirmado
 *     responses:
 *       200:
 *         description: Estado actualizado
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/PedidoConDetalle' }
 *       403: { description: Sin permisos (p. ej. un Vendedor intentando cancelar) }
 *       404: { description: No encontrado }
 *       409: { description: Transición de estado no permitida }
 *       422: { description: Errores de validación }
 */
router.patch(
  '/:id/estado',
  authenticate,
  authorize(...OPERADORES),
  autorizarCancelacion,
  updateEstadoRules,
  validate,
  pedidoController.updateEstadoPedido
)

/**
 * @openapi
 * /api/pedidos/{id}/cancelar:
 *   post:
 *     tags: [Pedidos]
 *     summary: Cancelar un pedido
 *     description: >
 *       Deja el pedido en estado `cancelado`. No se puede cancelar uno ya
 *       enviado o entregado. El motivo, si se envía, queda asentado en las notas.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo: { type: string, example: El cliente se arrepintió }
 *     responses:
 *       200:
 *         description: Pedido cancelado
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/PedidoConDetalle' }
 *       404: { description: No encontrado }
 *       409: { description: El pedido no admite cancelación }
 */
router.post(
  '/:id/cancelar',
  authenticate,
  authorize(...GESTORES),
  cancelPedidoRules,
  validate,
  pedidoController.cancelPedido
)

export default router
