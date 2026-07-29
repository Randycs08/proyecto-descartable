/**
 * CRUD de productos con subida de imagen (Multer, campo `imagen`).
 *
 * TODAS las rutas exigen JWT, incluidas las de lectura: este módulo devuelve
 * `precio_costo`, `proveedor_id` y el estado `activo`, que son datos internos
 * del negocio. Mientras el listado fue público, cualquiera podía consultar el
 * costo de la mercadería.
 *
 * El catálogo que ve un visitante vive en `/api/public/productos`, con las
 * columnas recortadas y `activo = 1` fijo. Si algo del sitio público necesita un
 * dato de acá, se agrega allá; NO se vuelve a abrir esta ruta.
 *
 * Lectura: cualquier usuario autenticado (incluido Vendedor, que consulta el
 * catálogo para cargar pedidos). Escritura: solo GESTORES.
 */

import { Router } from 'express'
import * as productoController from '../controllers/producto.controller.js'
import {
  createProductoRules,
  updateProductoRules,
  idParamRule,
} from '../validators/producto.validators.js'
import { validate } from '../middlewares/validate.middleware.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { uploadImage } from '../middlewares/upload.middleware.js'

const router = Router()

const GESTORES = ['Administrador', 'Empleado']

/**
 * @openapi
 * /api/productos:
 *   get:
 *     tags: [Productos]
 *     summary: Listar productos
 *     description: >
 *       Vista interna del catálogo: incluye `precio_costo`, `proveedor_id` y el
 *       estado `activo`. Requiere autenticación. Para el sitio público usar
 *       `GET /api/public/productos`.
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
 *         description: Busca por nombre o SKU
 *       - in: query
 *         name: categoriaId
 *         schema: { type: integer }
 *       - in: query
 *         name: activo
 *         schema: { type: boolean }
 *       - in: query
 *         name: destacado
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Listado paginado de productos
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Producto' }
 *                     meta: { $ref: '#/components/schemas/Paginacion' }
 *       401: { description: No autenticado }
 */
router.get('/', authenticate, productoController.listProductos)

/**
 * @openapi
 * /api/productos/{id}:
 *   get:
 *     tags: [Productos]
 *     summary: Obtener un producto por id
 *     description: >
 *       Devuelve los mismos campos internos que el listado, así que también
 *       requiere autenticación. La ficha pública es
 *       `GET /api/public/productos/{slug}`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Producto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Producto' }
 *       401: { description: No autenticado }
 *       404:
 *         description: No encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RespuestaError' }
 */
router.get('/:id', authenticate, idParamRule, validate, productoController.getProducto)

/**
 * @openapi
 * /api/productos:
 *   post:
 *     tags: [Productos]
 *     summary: Crear producto
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [sku, nombre, categoria_id, precio]
 *             properties:
 *               sku:                  { type: string, example: VAS-PL-180 }
 *               nombre:               { type: string, example: Vaso plástico 180cc x100 }
 *               descripcion:          { type: string }
 *               categoria_id:         { type: integer, example: 1 }
 *               marca_id:             { type: integer }
 *               proveedor_id:         { type: integer }
 *               precio:               { type: number, example: 950.00 }
 *               precio_costo:         { type: number, example: 620.00 }
 *               stock:                { type: integer, example: 300 }
 *               stock_minimo:         { type: integer, example: 50 }
 *               unidad_medida:        { type: string, example: paquete }
 *               unidades_por_paquete: { type: integer, example: 100 }
 *               destacado:            { type: boolean, example: true }
 *               activo:               { type: boolean, example: true }
 *               imagen:               { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Producto creado
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Producto' }
 *       401: { description: No autenticado }
 *       403: { description: Sin permisos }
 *       409: { description: SKU duplicado }
 *       422: { description: Errores de validación }
 */
router.post(
  '/',
  authenticate,
  authorize(...GESTORES),
  uploadImage('productos'),
  createProductoRules,
  validate,
  productoController.createProducto
)

/**
 * @openapi
 * /api/productos/{id}:
 *   put:
 *     tags: [Productos]
 *     summary: Actualizar producto
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               sku:                  { type: string }
 *               nombre:               { type: string }
 *               descripcion:          { type: string }
 *               categoria_id:         { type: integer }
 *               marca_id:             { type: integer }
 *               proveedor_id:         { type: integer }
 *               precio:               { type: number }
 *               precio_costo:         { type: number }
 *               stock:                { type: integer }
 *               stock_minimo:         { type: integer }
 *               unidad_medida:        { type: string }
 *               unidades_por_paquete: { type: integer }
 *               destacado:            { type: boolean }
 *               activo:               { type: boolean }
 *               imagen:               { type: string, format: binary }
 *     responses:
 *       200: { description: Producto actualizado }
 *       404: { description: No encontrado }
 *       409: { description: SKU duplicado }
 */
router.put(
  '/:id',
  authenticate,
  authorize(...GESTORES),
  uploadImage('productos'),
  updateProductoRules,
  validate,
  productoController.updateProducto
)

/**
 * @openapi
 * /api/productos/{id}:
 *   delete:
 *     tags: [Productos]
 *     summary: Eliminar producto
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Producto eliminado }
 *       404: { description: No encontrado }
 */
router.delete(
  '/:id',
  authenticate,
  authorize(...GESTORES),
  idParamRule,
  validate,
  productoController.deleteProducto
)

export default router
