/**
 * Imagen de producto o categoría, con un marcador cuando no hay foto cargada.
 *
 * Hoy ningún producto tiene imagen, y una grilla de cuadros grises iguales se ve
 * rota. El marcador arma un fondo con un color derivado del nombre, la inicial y
 * un ícono según el rubro, para que la ausencia se vea intencional.
 *
 * El color sale de un hash del nombre y no de un aleatorio, así la misma ficha
 * se ve igual en cada carga.
 *
 * TEMPORAL: en cuanto se carguen fotos desde el panel, este componente las usa
 * sin cambiar nada.
 */

import {
  Package2, GlassWater, UtensilsCrossed, Box, ShoppingBag, Layers, Coffee,
} from 'lucide-react'
import { cn, resolveImageUrl } from '@/lib/utils.js'

/** Paleta del marcador, con contraste suficiente para el ícono y la inicial. */
const TONOS = [
  'from-emerald-100 to-teal-200 text-emerald-800',
  'from-sky-100 to-cyan-200 text-sky-800',
  'from-amber-100 to-orange-200 text-amber-800',
  'from-violet-100 to-purple-200 text-violet-800',
  'from-rose-100 to-pink-200 text-rose-800',
  'from-lime-100 to-green-200 text-lime-800',
]

/** Íconos por rubro. El patrón se busca dentro del nombre o la categoría. */
const ICONOS = [
  [/vaso|copa|bebida/i, GlassWater],
  [/plato|bandeja/i, Layers],
  [/cubierto|tenedor|cuchar|cuchill/i, UtensilsCrossed],
  [/bolsa|papel|servilleta/i, ShoppingBag],
  [/envase|contenedor|caja/i, Box],
  [/café|cafe|termic/i, Coffee],
]

/** Hash estable de una cadena: mismo texto, mismo número, siempre. */
function hash(texto) {
  let valor = 0
  for (let i = 0; i < texto.length; i++) {
    valor = (valor * 31 + texto.charCodeAt(i)) | 0
  }
  return Math.abs(valor)
}

/** Ícono que mejor representa al producto según su nombre y su categoría. */
function elegirIcono(texto) {
  const encontrado = ICONOS.find(([patron]) => patron.test(texto))
  return encontrado ? encontrado[1] : Package2
}

/** `atenuada` es para productos sin stock; `zoom` acerca la imagen al pasar. */
export function ImagenProducto({
  src,
  nombre = '',
  categoria = '',
  proporcion = 'cuadrada',
  atenuada = false,
  zoom = false,
  className,
}) {
  const url = resolveImageUrl(src)

  // Proporción fija en todas las fichas: alinea la grilla aunque las fotos
  // vengan de tamaños distintos.
  const proporciones = {
    cuadrada: 'aspect-square',
    ancha: 'aspect-[4/3]',
    alta: 'aspect-[3/4]',
  }

  const contenedor = cn(
    'superficie-imagen flex items-center justify-center',
    proporciones[proporcion],
    className
  )

  if (url) {
    return (
      <div className={contenedor}>
        <img
          src={url}
          alt={nombre}
          loading="lazy"
          // object-cover recorta en vez de deformar: una foto estirada se nota.
          className={cn(
            'h-full w-full object-cover transition-transform duration-500',
            zoom && 'group-hover:scale-105',
            atenuada && 'opacity-50 grayscale'
          )}
        />
      </div>
    )
  }

  // --- Marcador de posición ---------------------------------------------------
  const semilla = hash(nombre || categoria || 'producto')
  const tono = TONOS[semilla % TONOS.length]
  const Icono = elegirIcono(`${categoria} ${nombre}`)
  const inicial = (nombre.trim()[0] || '?').toUpperCase()

  return (
    <div className={cn(contenedor, 'bg-gradient-to-br', tono, atenuada && 'opacity-60')}>
      {/* Trama tenue, para que el bloque no se lea como un error de carga. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 10px)',
        }}
      />
      <div className="relative flex flex-col items-center gap-1.5">
        <Icono className="h-9 w-9 opacity-80" strokeWidth={1.5} />
        <span className="text-2xl font-bold opacity-40">{inicial}</span>
      </div>
    </div>
  )
}
