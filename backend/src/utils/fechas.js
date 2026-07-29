/**
 * Fechas del negocio, todas en su zona horaria oficial.
 *
 * POR QUÉ EXISTE
 *
 * Las columnas DATETIME de MySQL (`fecha_pedido`, `created_at`) guardan la hora
 * de PARED del servidor, sin zona: un pedido de las 21:00 en Lima queda escrito
 * como "2026-07-27 21:00:00". No hay ningún dato que diga en qué zona es esa
 * hora, así que quien la compare tiene que usar la misma referencia.
 *
 * El Dashboard calculaba "hoy" con `Date.UTC(...)`, y a partir de las 19:00 en
 * Perú la fecha UTC ya es la del día siguiente: los pedidos de la tarde
 * quedaban fuera del período "hoy" y el panel los mostraba como cero.
 *
 * La solución es no mezclar: aquí se trabaja SIEMPRE con fechas de calendario
 * ('AAAA-MM-DD') resueltas en la zona del negocio, y se comparan contra la hora
 * de pared que guarda MySQL. No se convierte a UTC en ningún punto.
 *
 * Se usa `Intl` y no una resta fija de 5 horas para que la regla viva en un solo
 * lugar: Perú no tiene horario de verano hoy, pero si el negocio abriera en otro
 * país alcanza con cambiar la constante de abajo.
 */

/** Zona horaria oficial del negocio. */
export const ZONA_HORARIA = 'America/Lima'

// 'en-CA' formatea como AAAA-MM-DD, que es justo el formato que espera MySQL.
const formateador = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Fecha de calendario del negocio para un instante dado.
 *
 * @param {Date} [instante]  Por defecto, ahora.
 * @returns {string} 'AAAA-MM-DD' en la zona del negocio.
 */
export function fechaDelNegocio(instante = new Date()) {
  return formateador.format(instante)
}

/**
 * Suma (o resta) días a una fecha de calendario.
 *
 * Se opera con `Date.UTC` a propósito: acá la fecha es un número de calendario,
 * no un instante, y el UTC evita que un cambio de horario mueva el resultado.
 *
 * @param {string} fecha  'AAAA-MM-DD'
 * @param {number} dias
 * @returns {string} 'AAAA-MM-DD'
 */
export function sumarDias(fecha, dias) {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const movida = new Date(Date.UTC(anio, mes - 1, dia + dias))
  return movida.toISOString().slice(0, 10)
}

/**
 * Días de diferencia entre dos fechas de calendario.
 *
 * @param {string} desde  'AAAA-MM-DD'
 * @param {string} hasta  'AAAA-MM-DD'
 */
export function diferenciaEnDias(desde, hasta) {
  const aMs = (f) => {
    const [anio, mes, dia] = f.split('-').map(Number)
    return Date.UTC(anio, mes - 1, dia)
  }
  return Math.round((aMs(hasta) - aMs(desde)) / (24 * 60 * 60 * 1000))
}

/**
 * Convierte una fecha de calendario en el texto que compara MySQL contra un
 * DATETIME: la medianoche de ese día, en hora de pared.
 *
 * @param {string} fecha  'AAAA-MM-DD'
 * @returns {string} 'AAAA-MM-DD 00:00:00'
 */
export function inicioDelDia(fecha) {
  return `${fecha} 00:00:00`
}

/**
 * Fecha compacta AAAAMMDD del negocio, para los números de pedido.
 *
 * @param {Date} [instante]
 */
export function fechaCompacta(instante = new Date()) {
  return fechaDelNegocio(instante).replace(/-/g, '')
}
