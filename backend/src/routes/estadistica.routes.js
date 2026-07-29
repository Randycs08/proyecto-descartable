/**
 * Panel de estadísticas. Alimenta el Dashboard del administrador.
 *
 * Acceso: se restringe a GESTORES (Administrador y Empleado) porque expone la
 * facturación del negocio y el valor del inventario. El rol Vendedor, cuyo
 * alcance en el seed es "registro de pedidos y atención de clientes", queda
 * fuera. Es una decisión de negocio revisable en la constante de abajo; tenela
 * presente al construir la pantalla, porque el Dashboard es la página de inicio
 * del panel y un vendedor necesitaría una vista reducida.
 */

import { Router } from 'express'
import * as estadisticaController from '../controllers/estadistica.controller.js'
import { resumenRules } from '../validators/estadistica.validators.js'
import { validate } from '../middlewares/validate.middleware.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'

const router = Router()

const GESTORES = ['Administrador', 'Empleado']

/**
 * @openapi
 * /api/estadisticas/resumen:
 *   get:
 *     tags: [Estadísticas]
 *     summary: Resumen del panel
 *     description: >
 *       Devuelve en una sola llamada todas las métricas del Dashboard: ventas
 *       del período con su comparación contra el período anterior, pedidos por
 *       estado, situación del catálogo y del inventario, y datos de clientes.
 *
 *
 *       Sin parámetros toma los últimos 30 días. Los importes de venta excluyen
 *       los pedidos cancelados. Las métricas de catálogo, stock y total de
 *       clientes describen el estado actual y por lo tanto NO dependen del
 *       rango de fechas.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: desde
 *         schema: { type: string, format: date }
 *         example: '2026-07-01'
 *         description: Primer día incluido (AAAA-MM-DD)
 *       - in: query
 *         name: hasta
 *         schema: { type: string, format: date }
 *         example: '2026-07-31'
 *         description: Último día incluido, completo (AAAA-MM-DD)
 *     responses:
 *       200:
 *         description: Resumen del panel
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/ResumenEstadisticas' }
 *       401: { description: No autenticado }
 *       403: { description: Sin permisos }
 *       422: { description: Rango de fechas inválido }
 */
router.get(
  '/resumen',
  authenticate,
  authorize(...GESTORES),
  resumenRules,
  validate,
  estadisticaController.getResumen
)

export default router
