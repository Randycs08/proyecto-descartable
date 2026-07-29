/**
 * Carrito del sitio público, persistido en localStorage.
 *
 * Qué se guarda y qué no: se guarda el id, la cantidad y una copia de los datos
 * de presentación (nombre, precio, imagen) para poder dibujar el carrito sin
 * pedirle nada a la API al abrir la página. Esa copia es SOLO para mostrar. El
 * precio que vale es el del catálogo en el momento de comprar, y por eso al
 * confirmar el pedido se envían únicamente `producto_id` y `cantidad`.
 *
 * El carrito de alguien puede quedar días en el navegador: para entonces el
 * precio pudo cambiar y el producto pudo agotarse. La página de checkout vuelve
 * a consultar cada artículo antes de mostrar el resumen (ver Checkout.jsx).
 */

import { createContext, useCallback, useEffect, useMemo, useState } from 'react'

const CLAVE = 'descartables_carrito'

// eslint-disable-next-line react-refresh/only-export-components
export const CarritoContext = createContext(null)

/** Lee el carrito guardado, descartando cualquier contenido corrupto. */
function leerGuardado() {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return []
    const datos = JSON.parse(crudo)
    if (!Array.isArray(datos)) return []
    // Se filtra lo que no tenga lo mínimo: un carrito manipulado a mano no debe
    // romper la portada.
    return datos.filter((i) => Number.isInteger(i?.id) && Number(i?.cantidad) > 0)
  } catch {
    return []
  }
}

export function CarritoProvider({ children }) {
  const [items, setItems] = useState(leerGuardado)
  const [abierto, setAbierto] = useState(false)

  // Persistencia. Si el almacenamiento está lleno o bloqueado (modo privado),
  // el carrito sigue funcionando en memoria durante la visita.
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(items))
    } catch { /* sin persistencia, pero la sesión sigue */ }
  }, [items])

  /** Agrega un producto o suma a la línea existente. */
  const agregar = useCallback((producto, cantidad = 1) => {
    setItems((actuales) => {
      const i = actuales.findIndex((item) => item.id === producto.id)
      if (i !== -1) {
        return actuales.map((item, idx) =>
          idx === i ? { ...item, cantidad: item.cantidad + cantidad } : item
        )
      }
      return [
        ...actuales,
        {
          id: producto.id,
          slug: producto.slug,
          sku: producto.sku,
          nombre: producto.nombre,
          precio: Number(producto.precio),
          stock: Number(producto.stock),
          unidad_medida: producto.unidad_medida,
          unidades_por_paquete: producto.unidades_por_paquete,
          imagen_url: producto.imagen_url,
          cantidad,
        },
      ]
    })
  }, [])

  const cambiarCantidad = useCallback((id, cantidad) => {
    setItems((actuales) =>
      actuales.map((item) => (item.id === id ? { ...item, cantidad } : item))
    )
  }, [])

  const quitar = useCallback((id) => {
    setItems((actuales) => actuales.filter((item) => item.id !== id))
  }, [])

  /**
   * Vacía el carrito. Se llama SOLO cuando la API confirmó el pedido: si se
   * vaciara al enviar, un error de red dejaría al comprador sin carrito y sin
   * pedido.
   */
  const vaciar = useCallback(() => setItems([]), [])

  /** Refresca precio y stock con lo que devuelve la API (checkout). */
  const sincronizar = useCallback((frescos) => {
    setItems((actuales) =>
      actuales.map((item) => {
        const fresco = frescos.find((p) => p.id === item.id)
        if (!fresco) return item
        return {
          ...item,
          precio: Number(fresco.precio),
          stock: Number(fresco.stock),
          nombre: fresco.nombre,
          imagen_url: fresco.imagen_url,
        }
      })
    )
  }, [])

  const valor = useMemo(() => {
    const unidades = items.reduce((total, i) => total + i.cantidad, 0)
    // Total orientativo: el importe que vale es el que calcula el servidor.
    const subtotal = items.reduce((total, i) => total + i.precio * i.cantidad, 0)

    return {
      items,
      unidades,
      subtotal,
      vacio: items.length === 0,
      abierto,
      abrir: () => setAbierto(true),
      cerrar: () => setAbierto(false),
      agregar,
      cambiarCantidad,
      quitar,
      vaciar,
      sincronizar,
    }
  }, [items, abierto, agregar, cambiarCantidad, quitar, vaciar, sincronizar])

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>
}
