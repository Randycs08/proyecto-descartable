/**
 * Vocabulario del módulo de pedidos: cómo se muestra cada ENUM del schema y qué
 * transiciones de estado ofrece la interfaz.
 *
 * IMPORTANTE — TRANSICIONES es un espejo de la máquina de estados que vive en
 * `backend/src/services/pedido.service.js`. El backend sigue siendo la única
 * autoridad: acá el mapa solo sirve para NO ofrecer botones que van a terminar
 * en un 409. Si allá cambian las reglas, hay que actualizar este archivo; el
 * test de integración compara ambos mapas justamente para detectar la deriva.
 */

/** Estados del pedido, en el orden del ciclo de vida. */
export const ESTADOS_PEDIDO = {
  pendiente:  { label: 'Pendiente',  badge: 'warning',     barra: 'bg-amber-500' },
  confirmado: { label: 'Confirmado', badge: 'default',     barra: 'bg-primary' },
  en_proceso: { label: 'En proceso', badge: 'default',     barra: 'bg-sky-500' },
  enviado:    { label: 'Enviado',    badge: 'secondary',   barra: 'bg-indigo-500' },
  entregado:  { label: 'Entregado',  badge: 'success',     barra: 'bg-emerald-500' },
  cancelado:  { label: 'Cancelado',  badge: 'destructive', barra: 'bg-destructive' },
}

/**
 * A qué estados puede pasar un pedido según el estado en el que está.
 * `entregado` y `cancelado` son terminales.
 */
export const TRANSICIONES = {
  pendiente: ['confirmado', 'en_proceso', 'cancelado'],
  confirmado: ['en_proceso', 'enviado', 'cancelado'],
  en_proceso: ['enviado', 'cancelado'],
  enviado: ['entregado'],
  entregado: [],
  cancelado: [],
}

// 'yape' y 'plin' existen en el ENUM desde la migración 001. Antes el checkout
// público los guardaba como 'otro' y el medio real quedaba en las notas.
export const METODOS_PAGO = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  yape: 'Yape',
  plin: 'Plin',
  tarjeta: 'Tarjeta',
  mercadopago: 'Mercado Pago',
  cuenta_corriente: 'Cuenta corriente',
  otro: 'Otro',
}

export const ESTADOS_PAGO = {
  pendiente: { label: 'Pendiente', badge: 'warning' },
  parcial: { label: 'Parcial', badge: 'default' },
  pagado: { label: 'Pagado', badge: 'success' },
  reembolsado: { label: 'Reembolsado', badge: 'secondary' },
}

/** Etiqueta legible de un estado, con reserva por si el backend suma uno nuevo. */
export const etiquetaEstado = (estado) => ESTADOS_PEDIDO[estado]?.label ?? estado

/** Insignia de un estado. */
export const insigniaEstado = (estado) => ESTADOS_PEDIDO[estado]?.badge ?? 'secondary'
