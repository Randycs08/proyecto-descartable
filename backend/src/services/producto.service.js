/**
 * Lógica de negocio de productos: slug único, verificación de SKU y de
 * categoría existente, y borrado de la imagen física al eliminar/reemplazar.
 *
 * El borrado en disco se delega en `removeUploadedFile` (upload.middleware.js),
 * que es el único módulo que conoce dónde y cómo se almacenan los archivos.
 */

import * as productoModel from '../models/producto.model.js'
import * as categoriaModel from '../models/categoria.model.js'
import { removeUploadedFile } from '../middlewares/upload.middleware.js'
import { slugify } from '../utils/slugify.js'
import { ApiError } from '../utils/ApiError.js'

/** Genera un slug único agregando un sufijo si ya existe. */
async function buildUniqueSlug(nombre, ignoreId = null) {
  const base = slugify(nombre)
  let slug = base
  let n = 1
  // Reintenta hasta encontrar un slug libre.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existente = await productoModel.findBySlug(slug)
    if (!existente || existente.id === ignoreId) return slug
    slug = `${base}-${n++}`
  }
}

/** Verifica que la categoría exista (FK). */
async function assertCategoria(categoriaId) {
  const categoria = await categoriaModel.findById(categoriaId)
  if (!categoria) throw ApiError.badRequest('La categoría indicada no existe')
}

export async function list(filters) {
  return productoModel.findAll(filters)
}

export async function getById(id) {
  const producto = await productoModel.findById(id)
  if (!producto) throw ApiError.notFound('Producto no encontrado')
  return producto
}

/**
 * Crea un producto.
 * @param {object} data          Campos del producto (ya validados).
 * @param {string} [imagenUrl]   URL de la imagen subida (si la hubo).
 */
export async function create(data, imagenUrl) {
  await assertCategoria(data.categoria_id)

  // SKU único.
  const skuExistente = await productoModel.findBySku(data.sku)
  if (skuExistente) {
    throw ApiError.conflict('Ya existe un producto con ese SKU')
  }

  const slug = await buildUniqueSlug(data.nombre)

  return productoModel.create({ ...data, slug, imagen_url: imagenUrl ?? null })
}

/**
 * Actualiza un producto. Si llega una imagen nueva, reemplaza la anterior y
 * borra el archivo viejo del disco.
 */
export async function update(id, data, imagenUrl) {
  const actual = await getById(id)

  if (data.categoria_id) await assertCategoria(data.categoria_id)

  // SKU único (si cambió).
  if (data.sku && data.sku !== actual.sku) {
    const skuExistente = await productoModel.findBySku(data.sku)
    if (skuExistente && skuExistente.id !== Number(id)) {
      throw ApiError.conflict('Ya existe otro producto con ese SKU')
    }
  }

  const payload = { ...data }

  // Regenera slug si cambió el nombre.
  if (data.nombre && data.nombre !== actual.nombre) {
    payload.slug = await buildUniqueSlug(data.nombre, Number(id))
  }

  // Imagen nueva: solo se registra en el payload. El archivo anterior NO se
  // borra todavía.
  if (imagenUrl) payload.imagen_url = imagenUrl

  const actualizado = await productoModel.update(id, payload)

  // Recién con la actualización confirmada la imagen anterior queda sin dueño y
  // es seguro borrarla. Si se borrara antes y el UPDATE fallara, el registro
  // seguiría apuntando a un archivo ya inexistente (imagen rota).
  if (imagenUrl) await removeUploadedFile(actual.imagen_url)

  return actualizado
}

/** Elimina un producto y su imagen física. */
export async function remove(id) {
  const producto = await getById(id)
  await productoModel.remove(id)
  // La fila ya no existe: su imagen no la referencia nadie.
  await removeUploadedFile(producto.imagen_url)
}
