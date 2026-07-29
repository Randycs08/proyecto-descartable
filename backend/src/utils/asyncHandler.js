/**
 * Envuelve un controlador async y redirige cualquier excepción a `next()`,
 * para que el middleware central de errores la capture.
 *
 * Sin esto, un `throw` dentro de una función async quedaría como promesa
 * rechazada sin manejar. Con esto evitamos repetir try/catch en cada controlador.
 *
 * Uso:  router.get('/', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)
