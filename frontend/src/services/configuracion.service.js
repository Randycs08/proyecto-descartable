/**
 * Datos de la empresa contra la API. No hay listado ni id: la configuración es
 * una fila única.
 *
 * Se envía FormData porque el endpoint acepta el logo. A diferencia de
 * categorías y productos, acá los campos vacíos SÍ se mandan: si se omitieran,
 * borrar el contenido de un campo (por ejemplo quitar el WhatsApp) no tendría
 * ningún efecto, porque el backend deja como están los campos que no recibe.
 * Enviar la cadena vacía es lo que le indica que debe guardar NULL.
 */

import { api } from './api.js'

/**
 * Arma el FormData del formulario.
 * Incluye las cadenas vacías (limpian el campo) y descarta null/undefined.
 */
function toFormData(payload) {
  const fd = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined) return
    fd.append(key, value)
  })
  return fd
}

export const configuracionService = {
  /** GET /configuracion */
  async get() {
    const { data } = await api.get('/configuracion')
    return data.data
  },

  /**
   * PUT /configuracion — solo Administrador (con otro rol la API responde 403).
   * @param {object} payload  Campos del formulario; `logo` es el File opcional.
   */
  async update(payload) {
    const { data } = await api.put('/configuracion', toFormData(payload))
    return data.data
  },
}
