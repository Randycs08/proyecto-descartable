/**
 * Utilidades transversales de la UI.
 *
 * `cn(...)`: combina clases condicionales (clsx) y resuelve conflictos de
 * Tailwind (tailwind-merge). Ej: cn('p-2', isActive && 'bg-primary', 'p-4')
 * -> conserva 'p-4'. Es el helper estándar del enfoque shadcn/ui.
 */

import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Monedas admitidas. Lista ESTÁTICA: se elige una de estas y no se escribe a
 * mano, así no entran códigos inventados que después nadie sabe formatear.
 *
 * `simbolo` se define acá en vez de dejárselo a `Intl` porque los símbolos que
 * genera el navegador no siempre son los que usa el negocio: para PEN devuelve
 * "S/" y acá se quiere "S/.". El número sí lo arma `Intl` con el locale, que es
 * quien sabe dónde van los puntos y las comas.
 */
export const MONEDAS = {
  PEN: { simbolo: 'S/.', locale: 'es-PE', label: 'Sol peruano (S/.)' },
  USD: { simbolo: '$', locale: 'en-US', label: 'Dólar (US$)' },
  EUR: { simbolo: '€', locale: 'es-ES', label: 'Euro (€)' },
  ARS: { simbolo: '$', locale: 'es-AR', label: 'Peso argentino ($)' },
  CLP: { simbolo: '$', locale: 'es-CL', label: 'Peso chileno ($)' },
  COP: { simbolo: '$', locale: 'es-CO', label: 'Peso colombiano ($)' },
  MXN: { simbolo: '$', locale: 'es-MX', label: 'Peso mexicano ($)' },
  BOB: { simbolo: 'Bs.', locale: 'es-BO', label: 'Boliviano (Bs.)' },
}

/** Moneda que se usa cuando todavía no se leyó la configuración. */
export const MONEDA_POR_DEFECTO = 'PEN'

/**
 * Moneda vigente en la aplicación.
 *
 * Vive acá, a nivel de módulo, y no en un contexto de React, porque
 * `formatCurrency` se llama desde más de treinta lugares —tablas, tarjetas,
 * modales, el PDF del pedido— y pasarla por props a todos convertiría un detalle
 * de presentación en ruido en cada componente. Los dos layouts la fijan una vez
 * al cargar la configuración (ver `setMoneda`).
 */
let monedaActual = MONEDA_POR_DEFECTO

/**
 * Fija la moneda de toda la aplicación a partir de la configuración.
 * Un código desconocido se ignora: es preferible seguir mostrando importes en la
 * moneda anterior que romper cada precio de la pantalla.
 */
export function setMoneda(codigo) {
  if (codigo && MONEDAS[codigo]) monedaActual = codigo
}

/** Código de la moneda vigente. */
export function getMoneda() {
  return monedaActual
}

/**
 * Formatea un número como importe.
 * @param {number|string} value
 * @param {string} [codigo]  Fuerza una moneda concreta; por defecto, la vigente.
 */
export function formatCurrency(value, codigo) {
  // null/undefined/'' se tratan como "sin dato", no como cero: `Number(null)`
  // vale 0, así que un costo sin cargar se mostraba como "0.00" y parecía un
  // importe real. Columnas como `precio_costo` son NULLABLE justamente porque
  // "no sé cuánto" y "cuesta nada" no son lo mismo.
  if (value === null || value === undefined || value === '') return '-'

  const number = Number(value)
  if (Number.isNaN(number)) return '-'

  const { simbolo, locale } = MONEDAS[codigo] ?? MONEDAS[monedaActual] ?? MONEDAS[MONEDA_POR_DEFECTO]
  const importe = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number)

  return `${simbolo} ${importe}`
}

/** Formatea una fecha ISO a formato local corto. */
export function formatDate(value, locale = 'es-AR') {
  if (!value) return '-'
  return new Date(value).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Resuelve la URL absoluta de una imagen servida por el backend. */
export function resolveImageUrl(url) {
  if (!url) return null
  if (url.startsWith('http')) return url
  return url // en dev, Vite hace proxy de /uploads al backend
}
