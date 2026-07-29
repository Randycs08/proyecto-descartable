/**
 * Lógica del sitio público. Solo lectura: acá no se escribe nada.
 *
 * El servicio no vuelve a filtrar campos: el recorte de columnas ya lo hace
 * `publico.model.js` en el SELECT. Su trabajo es el de siempre —resolver el 404,
 * normalizar tipos y aplicar los valores por defecto del catálogo.
 */

import * as publicoModel from '../models/publico.model.js'
import { ApiError } from '../utils/ApiError.js'

/** Cantidad de productos por página cuando el visitante no pide otra. */
export const LIMITE_POR_DEFECTO = 12

/** Tope de productos por página: evita que una sola petición pida el catálogo entero. */
export const LIMITE_MAXIMO = 48

/**
 * Normaliza los tipos de MySQL a los que espera el navegador.
 * `decimalNumbers: true` ya devuelve los DECIMAL como número; esto cubre el
 * resto y deja los booleanos como tales.
 */
function aProductoPublico(fila) {
  return {
    ...fila,
    precio: Number(fila.precio),
    stock: Number(fila.stock),
    unidades_por_paquete: fila.unidades_por_paquete === null
      ? null
      : Number(fila.unidades_por_paquete),
    destacado: Boolean(fila.destacado),
  }
}

/** Catálogo público con filtros, orden y paginación. */
export async function listProductos(filtros) {
  const { rows, total } = await publicoModel.findProductos(filtros)
  return { rows: rows.map(aProductoPublico), total }
}

/** Ficha pública de un producto por slug, o 404. */
export async function getProductoPorSlug(slug) {
  const producto = await publicoModel.findProductoPorSlug(slug)
  if (!producto) throw ApiError.notFound('Producto no encontrado')
  return aProductoPublico(producto)
}

/** Categorías activas para la navegación y los filtros del catálogo. */
export async function listCategorias(opciones) {
  return publicoModel.findCategorias(opciones)
}

/**
 * Datos de contacto de la empresa.
 *
 * Si la fila no estuviera cargada se devuelve un objeto con los campos en null
 * en lugar de un 404: el encabezado y el pie del sitio se dibujan igual, solo
 * que sin datos. Un error acá dejaría la portada entera sin renderizar por algo
 * que es accesorio.
 */
export async function getConfiguracion() {
  const configuracion = await publicoModel.findConfiguracion()
  if (configuracion) return configuracion

  return {
    nombre_empresa: null, logo_url: null, email: null, telefono: null,
    whatsapp: null, direccion: null, ciudad: null, provincia: null,
    horario_atencion: null, facebook: null, instagram: null,
    twitter: null, tiktok: null, moneda: 'ARS',
  }
}
