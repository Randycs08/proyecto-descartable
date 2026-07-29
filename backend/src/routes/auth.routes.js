/**
 * Rutas de autenticación. Cada endpoint lleva su documentación OpenAPI en el
 * bloque @openapi para que aparezca en Swagger UI (/api/docs).
 */

import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import { loginRules } from '../validators/auth.validators.js'
import { validate } from '../middlewares/validate.middleware.js'
import { authenticate } from '../middlewares/auth.middleware.js'
import { loginRateLimit } from '../middlewares/rateLimit.middleware.js'

const router = Router()

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesión
 *     description: Valida las credenciales y devuelve un token JWT y los datos del usuario.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, example: admin@descartables.com }
 *               password: { type: string, example: tu-contraseña }
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         token:   { type: string, example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 }
 *                         usuario: { $ref: '#/components/schemas/Usuario' }
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RespuestaError' }
 *       422:
 *         description: Errores de validación
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RespuestaError' }
 *       429:
 *         description: Demasiados intentos fallidos (protección contra fuerza bruta)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RespuestaError' }
 */
// `loginRateLimit` va PRIMERO: se cuenta el intento antes de validar el cuerpo o
// de consultar la base, para que un atacante no pueda agotar recursos ni
// esquivar el límite enviando peticiones malformadas.
router.post('/login', loginRateLimit, loginRules, validate, authController.login)

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Cerrar sesión
 *     description: Endpoint de cortesía. Con JWT stateless el cliente debe descartar el token.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RespuestaExito' }
 */
router.post('/logout', authenticate, authController.logout)

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Perfil del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Usuario' }
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RespuestaError' }
 */
router.get('/me', authenticate, authController.me)

export default router
