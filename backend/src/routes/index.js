/**
 * Enrutador raíz de la API. Agrupa y monta todos los módulos bajo /api.
 * Al agregar un módulo nuevo (pedidos, clientes...), se importa y monta aquí.
 */

import { Router } from 'express'
import authRoutes from './auth.routes.js'
import categoriaRoutes from './categoria.routes.js'
import productoRoutes from './producto.routes.js'
import clienteRoutes from './cliente.routes.js'
import pedidoRoutes from './pedido.routes.js'
import estadisticaRoutes from './estadistica.routes.js'
import configuracionRoutes from './configuracion.routes.js'
import contactoRoutes from './contacto.routes.js'
import publicoRoutes from './publico.routes.js'

const router = Router()

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Auth]
 *     summary: Estado del servicio
 *     description: Verifica que la API esté en funcionamiento.
 *     responses:
 *       200:
 *         description: Servicio operativo
 */
router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'API operativa', data: { status: 'ok' } })
})

router.use('/auth', authRoutes)
router.use('/categorias', categoriaRoutes)
router.use('/productos', productoRoutes)
router.use('/clientes', clienteRoutes)
router.use('/pedidos', pedidoRoutes)
router.use('/estadisticas', estadisticaRoutes)
router.use('/configuracion', configuracionRoutes)
router.use('/contactos', contactoRoutes)
router.use('/public', publicoRoutes)

export default router
