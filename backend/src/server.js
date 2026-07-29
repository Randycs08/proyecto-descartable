/**
 * Punto de arranque del backend.
 *
 *   1. Verifica la conexión a MySQL.
 *   2. Pone la app de Express a escuchar en el puerto configurado.
 *   3. Maneja el cierre ordenado ante señales del sistema (SIGINT/SIGTERM).
 *
 * Ante una base inaccesible el comportamiento cambia según el entorno:
 *
 *   - En DESARROLLO se registra una advertencia y el servidor arranca igual,
 *     para poder mirar /api/docs mientras se termina de configurar MySQL.
 *   - En PRODUCCIÓN no arranca. Una API en pie pero sin base responde 500 a
 *     todo, y como /api/health contestaría "ok" el problema pasaría por bueno.
 *     Saliendo con código 1, el supervisor (Railway, PM2, systemd) reintenta,
 *     que es lo que corresponde cuando la base todavía no está lista.
 */

// Los imports son dinámicos, y en este orden, a propósito.
//
// `config/env.js` valida la configuración mientras se evalúa y lanza si falta
// una variable crítica. Con un `import` estático ese fallo sale como un stack
// trace de Node, y en los logs de un despliegue el mensaje útil queda sepultado
// entre rutas de archivo. Atrapándolo acá se imprime una sola línea legible.
let env
let isProduction
let app
let assertDatabaseConnection
let closePool

try {
  ;({ env, isProduction } = await import('./config/env.js'))
  ;({ assertDatabaseConnection, closePool } = await import('./config/db.js'))
  ;({ default: app } = await import('./app.js'))
} catch (error) {
  console.error(`❌ El servidor no pudo arrancar: ${error.message}`)
  process.exit(1)
}

/** Margen para terminar las peticiones en curso antes de cortar por lo sano. */
const MS_ESPERA_CIERRE = 10_000

async function start() {
  try {
    await assertDatabaseConnection()
    console.log('✅ Conexión a MySQL establecida')
  } catch (error) {
    if (isProduction) {
      console.error(`❌ ${error.message}`)
      console.error('   Revisá las variables DB_* del servicio antes de reintentar.')
      await closePool().catch(() => {})
      process.exit(1)
    }
    console.warn('⚠️  No se pudo conectar a MySQL:', error.message)
    console.warn('   El servidor arrancará igual; revisá las variables DB_* en .env')
  }

  // Sin host explícito, Node escucha en todas las interfaces, que es lo que
  // necesita un contenedor para recibir tráfico desde fuera.
  const server = app.listen(env.port, () => {
    console.log(`🚀 Servidor escuchando en el puerto ${env.port}`)
    console.log('📚 Documentación Swagger en /api/docs')
    console.log(`   Entorno: ${env.nodeEnv} · Frontend permitido: ${env.clientUrl}`)
  })

  // Cierre ordenado: deja terminar lo que está en vuelo y libera el pool.
  //
  // El temporizador es el que garantiza que el proceso muera: si una conexión
  // queda colgada, `server.close()` nunca llama a su callback y el contenedor
  // se quedaría trabado hasta que la plataforma lo mate a la fuerza.
  let cerrando = false

  const shutdown = async (motivo, codigo = 0) => {
    if (cerrando) return
    cerrando = true
    console.log(`\n${motivo} recibido. Cerrando servidor...`)

    const corte = setTimeout(() => {
      console.error('El cierre ordenado tardó demasiado; se fuerza la salida.')
      process.exit(codigo || 1)
    }, MS_ESPERA_CIERRE)
    corte.unref()

    await new Promise((resolve) => server.close(resolve))
    await closePool().catch(() => {})

    console.log('Servidor cerrado correctamente.')
    process.exit(codigo)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  // Sin estos manejadores, una promesa rechazada sin capturar tumba el proceso
  // sin dejar rastro de dónde ocurrió. Se registra el error y se sale con
  // código 1 para que el supervisor (Railway, PM2, systemd) reinicie.
  process.on('unhandledRejection', (motivo) => {
    console.error('[FATAL] Promesa rechazada sin manejar:', motivo)
    shutdown('unhandledRejection', 1)
  })

  process.on('uncaughtException', (error) => {
    console.error('[FATAL] Excepción no capturada:', error)
    process.exit(1)
  })
}

// Un fallo acá es de configuración (falta una variable, la base no responde en
// producción) y ya viene con su mensaje. Se imprime solo, sin el stack, que no
// aporta nada para leerlo entre los logs del despliegue.
start().catch((error) => {
  console.error(`❌ El servidor no pudo arrancar: ${error.message}`)
  process.exit(1)
})
