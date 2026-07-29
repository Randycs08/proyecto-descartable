/**
 * Convierte un texto en un "slug" apto para URLs:
 *   "Vaso Plastico 180cc x100"  ->  "vaso-plastico-180cc-x100"
 *
 * - Pasa a minúsculas.
 * - Quita acentos/diacríticos (normalización Unicode NFD + property escape).
 * - Reemplaza todo lo no alfanumérico por guiones y colapsa repetidos.
 */
export function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // elimina diacríticos (acentos, tildes)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // no alfanumérico -> guion
    .replace(/^-+|-+$/g, '') // quita guiones de los extremos
}
