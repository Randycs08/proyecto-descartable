/**
 * CRUD de clientes. Igual que en pedidos, NINGUNA ruta es pública: la ficha de
 * un cliente son datos personales (documento, dirección, teléfono), así que
 * todas exigen JWT.
 *
 * Roles:
 *   - OPERADORES: consultan, dan de alta, editan y activan/desactivan (incluye
 *     al vendedor, cuyo rol en el seed es "atención de clientes").
 *   - GESTORES: además pueden eliminar, que es la acción irreversible.
 */

import { Router } from 'express'
import * as clienteController from '../controllers/cliente.controller.js'
import {
  listClientesRules,
  createClienteRules,
  updateClienteRules,
  setEstadoRules,
  idParamRule,
  documentoParamRule,
} from '../validators/cliente.validators.js'
import { validate } from '../middlewares/validate.middleware.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'

const router = Router()

const OPERADORES = ['Administrador', 'Empleado', 'Vendedor']
const GESTORES = ['Administrador', 'Empleado']

/**
 * @openapi
 * /api/clientes:
 *   get:
 *     tags: [Clientes]
 *     summary: Listar clientes
 *     description: Listado paginado. `search` busca por nombre, apellido, razón social o documento.
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
 *         description: Nombre, apellido, razón social o documento (coincidencia parcial)
 *       - in: query
 *         name: activo
 *         schema: { type: boolean }
 *       - in: query
 *         name: tipoDocumento
 *         schema:
 *           type: string
 *           enum: [DNI, CUIT, CUIL, RUC, PASAPORTE, OTRO]
 *     responses:
 *       200:
 *         description: Listado paginado de clientes
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Cliente' }
 *                     meta: { $ref: '#/components/schemas/Paginacion' }
 *       401: { description: No autenticado }
 *       403: { description: Sin permisos }
 */
router.get(
  '/',
  authenticate,
  authorize(...OPERADORES),
  listClientesRules,
  validate,
  clienteController.listClientes
)

/**
 * @openapi
 * /api/clientes/documento/{documento}:
 *   get:
 *     tags: [Clientes]
 *     summary: Buscar un cliente por su documento
 *     description: >
 *       Búsqueda exacta por número de documento. Con el parámetro `tipo` se
 *       consulta la clave única (tipo + número); sin él alcanza con el número.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documento
 *         required: true
 *         schema: { type: string }
 *         example: '30111222'
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [DNI, CUIT, CUIL, RUC, PASAPORTE, OTRO]
 *     responses:
 *       200:
 *         description: Cliente encontrado
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Cliente' }
 *       404:
 *         description: No encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RespuestaError' }
 */
// Va antes que /:id por claridad; no hay ambigüedad porque tiene dos segmentos.
router.get(
  '/documento/:documento',
  authenticate,
  authorize(...OPERADORES),
  documentoParamRule,
  validate,
  clienteController.getClientePorDocumento
)

/**
 * @openapi
 * /api/clientes/{id}:
 *   get:
 *     tags: [Clientes]
 *     summary: Obtener un cliente por id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Cliente encontrado
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Cliente' }
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
  clienteController.getCliente
)

/**
 * @openapi
 * /api/clientes:
 *   post:
 *     tags: [Clientes]
 *     summary: Crear cliente
 *     description: >
 *       El par (tipo_documento, documento) es único. El documento es opcional:
 *       pueden coexistir varios clientes sin documento (venta de mostrador).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre:         { type: string, example: Martín }
 *               apellido:       { type: string, example: Sosa }
 *               razon_social:   { type: string, example: Rotisería La Esquina S.R.L. }
 *               tipo_documento:
 *                 type: string
 *                 enum: [DNI, CUIT, CUIL, RUC, PASAPORTE, OTRO]
 *                 default: DNI
 *               documento:      { type: string, example: '30111222' }
 *               email:          { type: string, example: martin.sosa@example.com }
 *               telefono:       { type: string, example: '+54 11 4111-2222' }
 *               direccion:      { type: string, example: Av. Rivadavia 1234 }
 *               ciudad:         { type: string, example: Buenos Aires }
 *               provincia:      { type: string, example: Buenos Aires }
 *               codigo_postal:  { type: string, example: '1406' }
 *               activo:         { type: boolean, default: true }
 *     responses:
 *       201:
 *         description: Cliente creado
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Cliente' }
 *       401: { description: No autenticado }
 *       403: { description: Sin permisos }
 *       409: { description: Documento ya registrado }
 *       422: { description: Errores de validación }
 */
router.post(
  '/',
  authenticate,
  authorize(...OPERADORES),
  createClienteRules,
  validate,
  clienteController.createCliente
)

/**
 * @openapi
 * /api/clientes/{id}:
 *   put:
 *     tags: [Clientes]
 *     summary: Actualizar cliente
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
 *               nombre:         { type: string }
 *               apellido:       { type: string }
 *               razon_social:   { type: string }
 *               tipo_documento:
 *                 type: string
 *                 enum: [DNI, CUIT, CUIL, RUC, PASAPORTE, OTRO]
 *               documento:      { type: string }
 *               email:          { type: string }
 *               telefono:       { type: string }
 *               direccion:      { type: string }
 *               ciudad:         { type: string }
 *               provincia:      { type: string }
 *               codigo_postal:  { type: string }
 *               activo:         { type: boolean }
 *     responses:
 *       200: { description: Cliente actualizado }
 *       404: { description: No encontrado }
 *       409: { description: Documento ya registrado por otro cliente }
 *       422: { description: Errores de validación }
 */
router.put(
  '/:id',
  authenticate,
  authorize(...OPERADORES),
  updateClienteRules,
  validate,
  clienteController.updateCliente
)

/**
 * @openapi
 * /api/clientes/{id}/estado:
 *   patch:
 *     tags: [Clientes]
 *     summary: Activar o desactivar un cliente
 *     description: >
 *       Baja lógica. Desactivar no borra nada ni afecta a los pedidos ya
 *       registrados: solo impide cargarle pedidos nuevos. La operación es
 *       idempotente.
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
 *             required: [activo]
 *             properties:
 *               activo: { type: boolean, example: false }
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
 *                     data: { $ref: '#/components/schemas/Cliente' }
 *       404: { description: No encontrado }
 *       422: { description: Errores de validación }
 */
router.patch(
  '/:id/estado',
  authenticate,
  authorize(...OPERADORES),
  setEstadoRules,
  validate,
  clienteController.setEstadoCliente
)

/**
 * @openapi
 * /api/clientes/{id}:
 *   delete:
 *     tags: [Clientes]
 *     summary: Eliminar cliente
 *     description: >
 *       Solo se puede eliminar un cliente que nunca haya sido usado en un
 *       pedido. Si ya operó, la baja correcta es desactivarlo, para que sus
 *       pedidos conserven a quién se facturaron.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Cliente eliminado }
 *       404: { description: No encontrado }
 *       409: { description: El cliente tiene pedidos asociados }
 */
router.delete(
  '/:id',
  authenticate,
  authorize(...GESTORES),
  idParamRule,
  validate,
  clienteController.deleteCliente
)

export default router
