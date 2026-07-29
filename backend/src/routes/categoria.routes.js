/**
 * CRUD de categorías. Documentación OpenAPI en cada endpoint.
 *
 * TODAS las rutas exigen JWT, incluidas las de lectura: este módulo expone el
 * estado `activo`, de modo que sin token se podían enumerar las categorías dadas
 * de baja. Se cierra por el mismo criterio que en productos, para que la
 * frontera entre lo interno y lo público sea una sola y no dependa del módulo.
 *
 * Las categorías que ve un visitante vienen de `/api/public/categorias`, que
 * solo devuelve las activas y sin campos internos.
 *
 * Lectura: cualquier usuario autenticado. Escritura: GESTORES (el borrado, solo
 * Administrador).
 */

import { Router } from 'express'
import * as categoriaController from '../controllers/categoria.controller.js'
import {
  createCategoriaRules,
  updateCategoriaRules,
  idParamRule,
} from '../validators/categoria.validators.js'
import { validate } from '../middlewares/validate.middleware.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { uploadImage } from '../middlewares/upload.middleware.js'

const router = Router()

// Roles con permiso de escritura sobre el catálogo.
const GESTORES = ['Administrador', 'Empleado']

/**
 * @openapi
 * /api/categorias:
 *   get:
 *     tags: [Categorías]
 *     summary: Listar categorías
 *     description: >
 *       Vista interna: incluye el estado `activo` y las categorías dadas de
 *       baja. Requiere autenticación. Para el sitio público usar
 *       `GET /api/public/categorias`.
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
 *         description: Búsqueda por nombre
 *       - in: query
 *         name: activo
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Listado paginado de categorías
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Categoria' }
 *                     meta: { $ref: '#/components/schemas/Paginacion' }
 *       401: { description: No autenticado }
 */
router.get('/', authenticate, categoriaController.listCategorias)

/**
 * @openapi
 * /api/categorias/{id}:
 *   get:
 *     tags: [Categorías]
 *     summary: Obtener una categoría por id
 *     description: >
 *       Devuelve los mismos campos internos que el listado, así que también
 *       requiere autenticación.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Categoría encontrada
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Categoria' }
 *       401: { description: No autenticado }
 *       404:
 *         description: No encontrada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RespuestaError' }
 */
router.get('/:id', authenticate, idParamRule, validate, categoriaController.getCategoria)

/**
 * @openapi
 * /api/categorias:
 *   post:
 *     tags: [Categorías]
 *     summary: Crear categoría
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre:      { type: string, example: Vasos }
 *               descripcion: { type: string, example: Vasos descartables }
 *               orden:       { type: integer, example: 1 }
 *               activo:      { type: boolean, example: true }
 *               imagen:      { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Categoría creada
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Categoria' }
 *       401: { description: No autenticado }
 *       403: { description: Sin permisos }
 *       409: { description: Nombre duplicado }
 *       422: { description: Errores de validación }
 */
router.post(
  '/',
  authenticate,
  authorize(...GESTORES),
  uploadImage('categorias'),
  createCategoriaRules,
  validate,
  categoriaController.createCategoria
)

/**
 * @openapi
 * /api/categorias/{id}:
 *   put:
 *     tags: [Categorías]
 *     summary: Actualizar categoría
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
 *               nombre:      { type: string }
 *               descripcion: { type: string }
 *               orden:       { type: integer }
 *               activo:      { type: boolean }
 *               imagen:      { type: string, format: binary }
 *     responses:
 *       200: { description: Categoría actualizada }
 *       404: { description: No encontrada }
 *       409: { description: Nombre duplicado }
 */
router.put(
  '/:id',
  authenticate,
  authorize(...GESTORES),
  uploadImage('categorias'),
  updateCategoriaRules,
  validate,
  categoriaController.updateCategoria
)

/**
 * @openapi
 * /api/categorias/{id}:
 *   delete:
 *     tags: [Categorías]
 *     summary: Eliminar categoría
 *     description: No permite eliminar si la categoría tiene productos asociados.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Categoría eliminada }
 *       404: { description: No encontrada }
 *       409: { description: Tiene productos asociados }
 */
router.delete(
  '/:id',
  authenticate,
  authorize('Administrador'),
  idParamRule,
  validate,
  categoriaController.deleteCategoria
)

export default router
