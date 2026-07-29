/**
 * Subida de imágenes con Multer, guardadas en disco local.
 *
 * Todo el conocimiento sobre el almacenamiento vive aquí: dónde van los
 * archivos, cómo se nombran, cómo se arma su URL y cómo se borran. Así una
 * migración futura a Cloudinary o S3 solo toca este archivo.
 */

import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

// Directorio raíz de uploads: <backend>/uploads
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_ROOT = path.resolve(__dirname, '..', '..', 'uploads')

// Extensiones/MIME de imagen permitidas.
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/**
 * Crea un middleware de subida para una subcarpeta de uploads.
 * @param {string} subfolder  Ej: 'productos', 'categorias', 'logos'.
 * @param {string} [field='imagen']  Nombre del campo del formulario (multipart).
 */
export function uploadImage(subfolder, field = 'imagen') {
  const destDir = path.join(UPLOADS_ROOT, subfolder)

  // Garantiza que la carpeta destino exista.
  fs.mkdirSync(destDir, { recursive: true })

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destDir),
    filename: (_req, file, cb) => {
      // Nombre único: <timestamp>-<aleatorio>.<ext> para evitar colisiones.
      const ext = path.extname(file.originalname).toLowerCase()
      const unique = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`
      cb(null, unique)
    },
  })

  const fileFilter = (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true)
    cb(ApiError.badRequest('Formato de imagen no permitido (usar JPG, PNG, WEBP o GIF)'))
  }

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: env.upload.maxSize },
  }).single(field)
}

/** Arma la URL pública: "/uploads/productos/169...-ab12.png". */
export function buildPublicUrl(subfolder, file) {
  return `/uploads/${subfolder}/${file.filename}`
}

/**
 * Traduce un archivo de Multer o una URL pública a una ruta absoluta.
 * Devuelve null si la ruta se sale de UPLOADS_ROOT: sin ese control, un
 * `imagen_url` manipulado ("/uploads/../../src/app.js") borraría otra cosa.
 */
function resolveUploadPath(target) {
  if (!target) return null

  // Objeto de Multer: ya trae la ruta absoluta donde escribió.
  // URL pública: "/uploads/<sub>/<archivo>" -> se resuelve contra UPLOADS_ROOT.
  let absolutePath
  if (typeof target === 'object') {
    if (!target.path) return null
    absolutePath = path.resolve(target.path)
  } else if (typeof target === 'string') {
    if (!target.startsWith('/uploads/')) return null
    absolutePath = path.resolve(UPLOADS_ROOT, target.slice('/uploads/'.length))
  } else {
    return null
  }

  // Contención: la ruta debe quedar DENTRO de uploads.
  const relative = path.relative(UPLOADS_ROOT, absolutePath)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null

  return absolutePath
}

/**
 * Borra un archivo subido. Nunca lanza: quien la llama suele estar en mitad de
 * un flujo de error y un fallo al limpiar el disco no debe tapar el error real.
 *
 * Se intenta el unlink directo y se ignora ENOENT, en vez de comprobar antes:
 * es una llamada al sistema en vez de dos y no tiene condición de carrera.
 */
export async function removeUploadedFile(target) {
  const filePath = resolveUploadPath(target)
  if (!filePath) return false

  try {
    await unlink(filePath)
    return true
  } catch (error) {
    // ENOENT = ya no estaba: es el resultado deseado, no un problema.
    if (error.code !== 'ENOENT') {
      console.warn('[uploads] No se pudo borrar el archivo:', filePath, '-', error.message)
    }
    return false
  }
}

/**
 * Reúne los archivos que Multer dejó en la petición. Contempla `req.files`
 * además de `req.file` por si más adelante se admiten galerías.
 */
export function collectUploadedFiles(req) {
  if (!req) return []
  const files = []

  if (req.file) files.push(req.file)

  if (Array.isArray(req.files)) {
    files.push(...req.files)
  } else if (req.files && typeof req.files === 'object') {
    // Forma de `.fields()`: { campo: [archivo, ...] }
    for (const group of Object.values(req.files)) {
      if (Array.isArray(group)) files.push(...group)
    }
  }

  return files
}
