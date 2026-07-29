/**
 * Bandeja de mensajes del panel.
 *
 * Acceso: GESTORES (Administrador y Empleado). El Vendedor queda fuera —recibe
 * 403— porque los mensajes traen datos de contacto de personas que todavía no
 * son clientes, y atender esa correspondencia no es parte de su alcance.
 *
 * El alta NO está acá: los mensajes entran por `POST /api/public/contacto`, sin
 * autenticación, que es el formulario del sitio.
 *
 * Tampoco hay DELETE. La tabla `contacto` no tiene columna de baja, así que
 * borrar sería físico e irreversible: se perdería el registro de que alguien
 * escribió. Un mensaje atendido se marca como leído y queda.
 */

import { Router } from 'express'
import * as contactoController from '../controllers/contacto.controller.js'
import {
  listContactosRules,
  idParamRule,
  setLeidoRules,
} from '../validators/contacto.validators.js'
import { validate } from '../middlewares/validate.middleware.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'

const router = Router()

const GESTORES = ['Administrador', 'Empleado']

/**
 * @openapi
 * /api/contactos:
 *   get:
 *     tags: [Contacto]
 *     summary: Listar mensajes recibidos
 *     description: >
 *       Bandeja paginada de los mensajes del formulario del sitio. Se puede
 *       buscar por nombre, correo, asunto o contenido, filtrar por leídos y
 *       ordenar por fecha.
 *
 *
 *       El listado devuelve `resumen` (los primeros 160 caracteres del mensaje)
 *       en lugar del texto completo: la columna es TEXT y la bandeja se consulta
 *       de a páginas. El mensaje entero está en `GET /api/contactos/{id}`.
 *
 *
 *       `meta.sinLeer` trae el total de mensajes pendientes, para el aviso del
 *       panel.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: search
 *         schema: { type: string, maxLength: 100 }
 *       - in: query
 *         name: leido
 *         schema: { type: string, enum: ['true', 'false'] }
 *       - in: query
 *         name: orden
 *         schema: { type: string, enum: [recientes, antiguos], default: recientes }
 *     responses:
 *       200:
 *         description: Listado de mensajes
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/ContactoResumen' }
 *                     meta: { $ref: '#/components/schemas/Paginacion' }
 *       401: { description: No autenticado }
 *       403: { description: Sin permisos (el Vendedor no accede) }
 *       422: { description: Filtros inválidos }
 */
router.get(
  '/',
  authenticate,
  authorize(...GESTORES),
  listContactosRules,
  validate,
  contactoController.listContactos
)

/**
 * @openapi
 * /api/contactos/{id}:
 *   get:
 *     tags: [Contacto]
 *     summary: Ver un mensaje completo
 *     description: >
 *       Devuelve el mensaje entero más la IP desde la que se envió, útil para
 *       reconocer envíos repetidos.
 *
 *
 *       Consultarlo NO lo marca como leído: un GET no debería cambiar el estado
 *       de nada. Para eso está `PATCH /api/contactos/{id}/leido`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Mensaje encontrado
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Contacto' }
 *       401: { description: No autenticado }
 *       403: { description: Sin permisos }
 *       404:
 *         description: No encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RespuestaError' }
 */
router.get(
  '/:id',
  authenticate,
  authorize(...GESTORES),
  idParamRule,
  validate,
  contactoController.getContacto
)

/**
 * @openapi
 * /api/contactos/{id}/leido:
 *   patch:
 *     tags: [Contacto]
 *     summary: Marcar un mensaje como leído o no leído
 *     description: >
 *       `leido` es el ÚNICO estado que define el schema de `contacto`: no
 *       existen "respondido" ni "cerrado". La acción es reversible en los dos
 *       sentidos, así que marcar sin querer se deshace desde la misma pantalla.
 *
 *
 *       Es idempotente: enviar el estado que el mensaje ya tiene devuelve 200
 *       sin escribir.
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
 *             required: [leido]
 *             properties:
 *               leido: { type: boolean, example: true }
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
 *                     data: { $ref: '#/components/schemas/Contacto' }
 *       401: { description: No autenticado }
 *       403: { description: Sin permisos }
 *       404: { description: No encontrado }
 *       422: { description: Errores de validación }
 */
router.patch(
  '/:id/leido',
  authenticate,
  authorize(...GESTORES),
  setLeidoRules,
  validate,
  contactoController.setLeidoContacto
)

export default router
