/**
 * Reglas de validación del panel de estadísticas (express-validator).
 *
 * El único parámetro es el rango de fechas. Se valida el formato y la
 * coherencia (desde <= hasta) para no dejar que un rango invertido devuelva
 * silenciosamente todo en cero, que es peor que un error: parece un dato.
 */

import { query } from 'express-validator'

/** Formato ISO de día, sin hora: AAAA-MM-DD. */
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/

export const resumenRules = [
  query('desde')
    .optional({ values: 'falsy' })
    .matches(FORMATO_FECHA).withMessage('desde debe tener el formato AAAA-MM-DD')
    .isISO8601().withMessage('desde no es una fecha válida'),
  query('hasta')
    .optional({ values: 'falsy' })
    .matches(FORMATO_FECHA).withMessage('hasta debe tener el formato AAAA-MM-DD')
    .isISO8601().withMessage('hasta no es una fecha válida')
    .custom((valor, { req }) => {
      if (req.query.desde && valor < req.query.desde) {
        throw new Error('hasta no puede ser anterior a desde')
      }
      return true
    }),
]
