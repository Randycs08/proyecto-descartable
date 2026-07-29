/**
 * Datos de la empresa (fila singleton id=1). No hay parámetros de ruta ni
 * listado: la configuración es una sola.
 *
 * Roles:
 *   - GESTORES (Administrador, Empleado): pueden consultarla. La necesitan para
 *     operar el panel.
 *   - Administrador: es el único que puede modificarla. Cambia la identidad del
 *     negocio (nombre, logo, contacto), así que no es tarea de gestión diaria.
 *
 * Tampoco se expone DELETE: borrar la fila dejaría al sistema sin configuración
 * y el CHECK del schema impide recrearla con otro id.
 *
 * Orden de los middlewares en el PUT: el control de rol va ANTES de Multer, así
 * una petición sin permisos se rechaza sin haber escrito ningún archivo.
 */

import { Router } from 'express'
import * as configuracionController from '../controllers/configuracion.controller.js'
import { updateConfiguracionRules } from '../validators/configuracion.validators.js'
import { validate } from '../middlewares/validate.middleware.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { uploadImage } from '../middlewares/upload.middleware.js'

const router = Router()

const GESTORES = ['Administrador', 'Empleado']

/**
 * @openapi
 * /api/configuracion:
 *   get:
 *     tags: [Configuración]
 *     summary: Obtener la configuración de la empresa
 *     description: >
 *       Devuelve la única fila de configuración (id=1): nombre, logo, datos de
 *       contacto, redes sociales y moneda. Disponible para Administrador y
 *       Empleado.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración obtenida
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Configuracion' }
 *       401: { description: No autenticado }
 *       403: { description: Sin permisos }
 *       404: { description: La configuración no está inicializada }
 */
router.get(
  '/',
  authenticate,
  authorize(...GESTORES),
  configuracionController.getConfiguracion
)

/**
 * @openapi
 * /api/configuracion:
 *   put:
 *     tags: [Configuración]
 *     summary: Actualizar la configuración de la empresa
 *     description: >
 *       Actualiza los datos de la empresa. **Solo Administrador**: Empleado y
 *       Vendedor reciben 403.
 *
 *
 *       Se envía como `multipart/form-data` porque admite el logo. Los campos
 *       que no se manden quedan como están; los que se manden vacíos se guardan
 *       como NULL, que es la forma de limpiar un dato opcional. `nombre_empresa`
 *       y `moneda` no admiten vacío.
 *
 *
 *       Si se sube un logo nuevo, el anterior se borra del disco recién cuando
 *       la actualización se confirmó. Si la validación falla, se descarta el
 *       archivo recibido y se conserva el logo anterior.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               nombre_empresa:   { type: string, maxLength: 150, example: Descartables del Sur }
 *               email:            { type: string, format: email, maxLength: 150 }
 *               telefono:         { type: string, maxLength: 30 }
 *               whatsapp:         { type: string, maxLength: 30 }
 *               direccion:        { type: string, maxLength: 255 }
 *               ciudad:           { type: string, maxLength: 100 }
 *               provincia:        { type: string, maxLength: 100 }
 *               horario_atencion: { type: string, maxLength: 180, example: 'Lun a Vie de 8 a 18 h' }
 *               facebook:         { type: string, maxLength: 255 }
 *               instagram:        { type: string, maxLength: 255 }
 *               twitter:          { type: string, maxLength: 255 }
 *               tiktok:           { type: string, maxLength: 255 }
 *               moneda:           { type: string, maxLength: 10, example: ARS }
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Imagen del logo (JPG, PNG, WEBP o GIF)
 *     responses:
 *       200:
 *         description: Configuración actualizada
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RespuestaExito'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Configuracion' }
 *       400: { description: Formato de imagen no permitido }
 *       401: { description: No autenticado }
 *       403: { description: Sin permisos (solo Administrador) }
 *       404: { description: La configuración no está inicializada }
 *       422: { description: Errores de validación }
 */
router.put(
  '/',
  authenticate,
  authorize('Administrador'),
  uploadImage('logos', 'logo'),
  updateConfiguracionRules,
  validate,
  configuracionController.updateConfiguracion
)

export default router
