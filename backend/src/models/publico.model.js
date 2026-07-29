/**
 * Consultas del SITIO PÚBLICO. Solo lectura.
 *
 * Por qué existe este modelo en vez de reutilizar `producto.model.js` y
 * `categoria.model.js`: aquellos seleccionan columnas internas del negocio
 * (`precio_costo`, `proveedor_id`, `activo`, marcas de tiempo). Filtrarlas
 * después en JavaScript funcionaría hoy, pero bastaría con que alguien agregue
 * una columna sensible al SELECT compartido para que se publique sin que nadie
 * lo note.
 *
 * Acá la lista de columnas públicas está escrita a mano y es la única fuente:
 * lo que no figura en estos SELECT no puede salir. Es duplicación deliberada, y
 * es la que hace que el límite entre lo interno y lo público sea visible.
 *
 * Dos invariantes que estas consultas imponen SIEMPRE, sin depender de lo que
 * mande el visitante:
 *   - `activo = 1`: nunca se listan productos ni categorías dados de baja.
 *   - el orden sale de una lista blanca; jamás se interpola texto recibido.
 */

import { pool } from '../config/db.js'

// Columnas visibles para un visitante. NO incluye precio_costo, proveedor_id,
// stock_minimo, activo ni marcas de tiempo.
const SELECT_PRODUCTO = `
  SELECT p.id, p.sku, p.nombre, p.slug, p.descripcion,
         p.categoria_id, c.nombre AS categoria_nombre, c.slug AS categoria_slug,
         m.nombre AS marca_nombre,
         p.precio, p.stock, p.unidad_medida, p.unidades_por_paquete,
         p.imagen_url, p.destacado
    FROM productos p
    LEFT JOIN categorias c ON c.id = p.categoria_id
    LEFT JOIN marcas m     ON m.id = p.marca_id
`

/**
 * Ordenamientos permitidos. La clave llega por query string; el valor es el
 * fragmento SQL. Al no aceptar nada fuera de estas claves, no hay forma de
 * inyectar SQL por el ORDER BY (que no admite parámetros preparados).
 */
const ORDENES = {
  nombre: 'p.nombre ASC',
  nombre_desc: 'p.nombre DESC',
  precio: 'p.precio ASC',
  precio_desc: 'p.precio DESC',
  recientes: 'p.created_at DESC',
}

export const ORDENES_VALIDOS = Object.keys(ORDENES)

/**
 * Lista productos publicables con filtros y paginación.
 *
 * @param {object} opts
 * @param {string}  [opts.search]      Nombre o SKU (coincidencia parcial).
 * @param {number}  [opts.categoriaId]
 * @param {boolean} [opts.destacado]
 * @param {boolean} [opts.disponible]  true = solo con stock.
 * @param {string}  [opts.orden]       Clave de ORDENES.
 * @param {number}  [opts.limit]
 * @param {number}  [opts.offset]
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export async function findProductos({
  search, categoriaId, destacado, disponible, orden, limit = 12, offset = 0,
} = {}) {
  // El catálogo público solo muestra productos activos de categorías activas:
  // una categoría dada de baja no debe seguir publicando su mercadería.
  const where = ['p.activo = 1', '(c.id IS NULL OR c.activo = 1)']
  const params = []

  if (search) {
    where.push('(p.nombre LIKE ? OR p.sku LIKE ?)')
    params.push(`%${search}%`, `%${search}%`)
  }
  if (categoriaId) {
    where.push('p.categoria_id = ?')
    params.push(categoriaId)
  }
  if (destacado === true) where.push('p.destacado = 1')
  if (disponible === true) where.push('p.stock > 0')

  const whereSql = `WHERE ${where.join(' AND ')}`
  const orderSql = ORDENES[orden] ?? ORDENES.recientes

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM productos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
      ${whereSql}`,
    params
  )

  const [rows] = await pool.query(
    `${SELECT_PRODUCTO} ${whereSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  return { rows, total: countRows[0].total }
}

/** Busca un producto publicable por su slug. */
export async function findProductoPorSlug(slug) {
  const [rows] = await pool.query(
    `${SELECT_PRODUCTO}
      WHERE p.slug = ? AND p.activo = 1 AND (c.id IS NULL OR c.activo = 1)
      LIMIT 1`,
    [slug]
  )
  return rows[0] || null
}

/**
 * Categorías activas con la cantidad de productos publicables de cada una.
 * El conteo se resuelve en SQL: es el dato que decide si la categoría se muestra
 * en la portada, y contarlo en el navegador dejaría de ser cierto al paginar.
 */
export async function findCategorias({ soloConProductos = false } = {}) {
  const [rows] = await pool.query(
    `SELECT c.id, c.nombre, c.slug, c.descripcion, c.imagen_url,
            COUNT(p.id) AS productos
       FROM categorias c
       LEFT JOIN productos p ON p.categoria_id = c.id AND p.activo = 1
      WHERE c.activo = 1
      GROUP BY c.id, c.nombre, c.slug, c.descripcion, c.imagen_url, c.orden
      ${soloConProductos ? 'HAVING productos > 0' : ''}
      ORDER BY c.orden ASC, c.nombre ASC`
  )
  return rows.map((r) => ({ ...r, productos: Number(r.productos) }))
}

/**
 * Datos de contacto de la empresa. Devuelve solo lo que tiene sentido publicar:
 * quedan fuera el id, las marcas de tiempo y cualquier campo interno futuro.
 */
export async function findConfiguracion() {
  const [rows] = await pool.query(
    `SELECT nombre_empresa, logo_url, email, telefono, whatsapp,
            direccion, ciudad, provincia, horario_atencion,
            facebook, instagram, twitter, tiktok, moneda
       FROM configuracion
      WHERE id = 1`
  )
  return rows[0] || null
}
