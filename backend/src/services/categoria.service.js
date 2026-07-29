/**
 * Lógica de negocio de categorías: generación de slug, verificación de
 * unicidad, reglas de borrado seguro y orquestación del modelo.
 *
 * Igual que en productos, el borrado de la imagen física se delega en
 * `removeUploadedFile` (upload.middleware.js).
 */

import * as categoriaModel from '../models/categoria.model.js'
import { removeUploadedFile } from '../middlewares/upload.middleware.js'
import { slugify } from '../utils/slugify.js'
import { ApiError } from '../utils/ApiError.js'

/** Lista paginada de categorías. */
export async function list(filters) {
  return categoriaModel.findAll(filters)
}

/** Obtiene una categoría por id o lanza 404. */
export async function getById(id) {
  const categoria = await categoriaModel.findById(id)
  if (!categoria) throw ApiError.notFound('Categoría no encontrada')
  return categoria
}

/** Crea una categoría, generando el slug y validando que no exista. */
export async function create(data) {
  const slug = slugify(data.nombre)

  const existente = await categoriaModel.findBySlug(slug)
  if (existente) {
    throw ApiError.conflict('Ya existe una categoría con ese nombre')
  }

  return categoriaModel.create({ ...data, slug })
}

/** Actualiza una categoría; si cambia el nombre, regenera y valida el slug. */
export async function update(id, data) {
  const actual = await getById(id) // garantiza que exista (404 si no)

  const payload = { ...data }
  if (data.nombre) {
    const slug = slugify(data.nombre)
    const existente = await categoriaModel.findBySlug(slug)
    if (existente && existente.id !== Number(id)) {
      throw ApiError.conflict('Ya existe otra categoría con ese nombre')
    }
    payload.slug = slug
  }

  const actualizado = await categoriaModel.update(id, payload)

  // Si llegó una imagen nueva (el controlador la puso en `imagen_url`), la
  // anterior queda sin dueño. Se borra recién ahora, con el UPDATE confirmado.
  if (data.imagen_url && data.imagen_url !== actual.imagen_url) {
    await removeUploadedFile(actual.imagen_url)
  }

  return actualizado
}

/** Elimina una categoría, impidiendo el borrado si tiene productos asociados. */
export async function remove(id) {
  const categoria = await getById(id)

  const productos = await categoriaModel.countProductos(id)
  if (productos > 0) {
    throw ApiError.conflict(
      `No se puede eliminar: la categoría tiene ${productos} producto(s) asociado(s)`
    )
  }

  await categoriaModel.remove(id)
  // La fila ya no existe: su imagen no la referencia nadie.
  await removeUploadedFile(categoria.imagen_url)
}
