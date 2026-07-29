/**
 * Configuración de Swagger / OpenAPI 3.0.
 *
 * Se usa `swagger-jsdoc` para construir la especificación a partir de los
 * comentarios JSDoc (@openapi) escritos en los archivos de rutas, y
 * `swagger-ui-express` para servir la UI interactiva en /api/docs.
 *
 * Aquí se definen: info general, servidores, el esquema de seguridad (JWT
 * Bearer) y los componentes/schemas reutilizables por los endpoints.
 */

import swaggerJSDoc from 'swagger-jsdoc'
import { env } from './env.js'

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'API JAGN Solution',
    version: '1.0.0',
    description:
      'API REST de JAGN Solution, tienda de productos descartables. Módulos disponibles: ' +
      'Autenticación, Categorías, Productos, Clientes, Pedidos y Estadísticas.',
  },
  servers: [
    { url: `http://localhost:${env.port}`, description: 'Servidor local' },
  ],
  components: {
    // Esquema de seguridad: token JWT en el header Authorization.
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Pegar el token devuelto por /api/auth/login',
      },
    },
    schemas: {
      // --- Respuestas genéricas ---
      RespuestaExito: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operación exitosa' },
          data: { type: 'object', nullable: true },
        },
      },
      RespuestaError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error de validación' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                campo: { type: 'string', example: 'email' },
                mensaje: { type: 'string', example: 'El email no es válido' },
              },
            },
          },
        },
      },
      Paginacion: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 42 },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          totalPages: { type: 'integer', example: 3 },
          hasNextPage: { type: 'boolean', example: true },
          hasPrevPage: { type: 'boolean', example: false },
        },
      },
      // --- Entidades ---
      Usuario: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          nombre: { type: 'string', example: 'Administrador' },
          apellido: { type: 'string', example: 'Principal' },
          email: { type: 'string', example: 'admin@descartables.com' },
          rol: { type: 'string', example: 'Administrador' },
          activo: { type: 'boolean', example: true },
        },
      },
      Categoria: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          nombre: { type: 'string', example: 'Vasos' },
          slug: { type: 'string', example: 'vasos' },
          descripcion: { type: 'string', nullable: true, example: 'Vasos descartables' },
          imagen_url: { type: 'string', nullable: true, example: '/uploads/categorias/abc.png' },
          orden: { type: 'integer', example: 1 },
          activo: { type: 'boolean', example: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      Producto: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          sku: { type: 'string', example: 'VAS-PL-180' },
          nombre: { type: 'string', example: 'Vaso plástico 180cc x100' },
          slug: { type: 'string', example: 'vaso-plastico-180cc-x100' },
          descripcion: { type: 'string', nullable: true },
          categoria_id: { type: 'integer', example: 1 },
          categoria_nombre: { type: 'string', example: 'Vasos' },
          marca_id: { type: 'integer', nullable: true },
          precio: { type: 'number', format: 'float', example: 950.00 },
          precio_costo: { type: 'number', format: 'float', nullable: true, example: 620.00 },
          stock: { type: 'integer', example: 300 },
          stock_minimo: { type: 'integer', example: 50 },
          unidad_medida: { type: 'string', example: 'paquete' },
          unidades_por_paquete: { type: 'integer', nullable: true, example: 100 },
          imagen_url: { type: 'string', nullable: true },
          destacado: { type: 'boolean', example: true },
          activo: { type: 'boolean', example: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      Cliente: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          nombre: { type: 'string', example: 'Martín' },
          apellido: { type: 'string', nullable: true, example: 'Sosa' },
          razon_social: {
            type: 'string',
            nullable: true,
            example: 'Rotisería La Esquina S.R.L.',
            description: 'Solo para clientes empresa; el nombre sigue siendo el del contacto',
          },
          tipo_documento: {
            type: 'string',
            enum: ['DNI', 'CUIT', 'CUIL', 'RUC', 'PASAPORTE', 'OTRO'],
            example: 'DNI',
          },
          documento: { type: 'string', nullable: true, example: '30111222' },
          email: { type: 'string', nullable: true, example: 'martin.sosa@example.com' },
          telefono: { type: 'string', nullable: true, example: '998 268 132' },
          direccion: { type: 'string', nullable: true, example: 'Av. Los Álamos 123' },
          ciudad: { type: 'string', nullable: true, example: 'Lima' },
          provincia: { type: 'string', nullable: true, example: 'Lima' },
          codigo_postal: { type: 'string', nullable: true, example: '1406' },
          activo: { type: 'boolean', example: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      // Cabecera del pedido, tal como la devuelve el listado.
      Pedido: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          numero: { type: 'string', example: 'PED-20260727-0001' },
          cliente_id: { type: 'integer', example: 1 },
          cliente_nombre: { type: 'string', example: 'Rotisería La Esquina S.R.L.' },
          usuario_id: { type: 'integer', nullable: true, example: 1 },
          usuario_nombre: { type: 'string', nullable: true, example: 'Administrador Principal' },
          estado: {
            type: 'string',
            enum: ['pendiente', 'confirmado', 'en_proceso', 'enviado', 'entregado', 'cancelado'],
            example: 'pendiente',
          },
          metodo_pago: {
            type: 'string',
            enum: ['efectivo', 'transferencia', 'tarjeta', 'mercadopago',
                   'cuenta_corriente', 'otro', 'yape', 'plin'],
            example: 'efectivo',
          },
          estado_pago: {
            type: 'string',
            enum: ['pendiente', 'parcial', 'pagado', 'reembolsado'],
            example: 'pendiente',
          },
          subtotal: { type: 'number', format: 'float', example: 9500.00 },
          descuento: { type: 'number', format: 'float', example: 0.00 },
          impuestos: { type: 'number', format: 'float', example: 0.00 },
          total: { type: 'number', format: 'float', example: 9500.00 },
          direccion_entrega: { type: 'string', nullable: true, example: 'Av. Arequipa 1234' },
          distrito: { type: 'string', nullable: true, example: 'Miraflores' },
          referencia_entrega: { type: 'string', nullable: true, example: 'Frente al parque' },
          notas: { type: 'string', nullable: true },
          fecha_pedido: { type: 'string', format: 'date-time' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      // Línea del pedido. `descripcion` y `precio_unitario` son la foto del
      // producto al momento de la venta; `producto_nombre` es el valor actual.
      DetallePedido: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          pedido_id: { type: 'integer', example: 1 },
          producto_id: { type: 'integer', example: 1 },
          producto_sku: { type: 'string', example: 'VAS-PL-180' },
          producto_nombre: { type: 'string', example: 'Vaso plástico 180cc x100' },
          descripcion: { type: 'string', example: 'Vaso plástico 180cc x100' },
          cantidad: { type: 'integer', example: 10 },
          precio_unitario: { type: 'number', format: 'float', example: 950.00 },
          descuento: { type: 'number', format: 'float', example: 0.00 },
          subtotal: { type: 'number', format: 'float', example: 9500.00 },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      // Respuesta de /api/estadisticas/resumen.
      ResumenEstadisticas: {
        type: 'object',
        properties: {
          periodo: {
            type: 'object',
            description: 'Rango analizado. Ambos días se incluyen completos.',
            properties: {
              desde: { type: 'string', format: 'date', example: '2026-06-28' },
              hasta: { type: 'string', format: 'date', example: '2026-07-27' },
              dias: { type: 'integer', example: 30 },
            },
          },
          ventas: {
            type: 'object',
            description: 'Flujo del período. Excluye los pedidos cancelados.',
            properties: {
              total: { type: 'number', format: 'float', example: 128400.00 },
              pedidos: { type: 'integer', example: 42 },
              ticketPromedio: { type: 'number', format: 'float', example: 3057.14 },
              anterior: {
                type: 'object',
                description: 'Mismas métricas del período inmediatamente anterior, de igual duración.',
                properties: {
                  total: { type: 'number', format: 'float' },
                  pedidos: { type: 'integer' },
                  ticketPromedio: { type: 'number', format: 'float' },
                },
              },
              variacion: {
                type: 'object',
                description: 'Variación porcentual contra el período anterior. null si no hay base de comparación.',
                properties: {
                  total: { type: 'number', nullable: true, example: 12.5 },
                  pedidos: { type: 'number', nullable: true, example: -3.2 },
                  ticketPromedio: { type: 'number', nullable: true, example: 16.1 },
                },
              },
            },
          },
          pedidos: {
            type: 'object',
            properties: {
              total: { type: 'integer', example: 45 },
              porEstado: {
                type: 'object',
                description: 'Siempre trae las seis claves; los estados sin pedidos vienen en 0.',
                properties: {
                  pendiente: { type: 'integer', example: 3 },
                  confirmado: { type: 'integer', example: 5 },
                  en_proceso: { type: 'integer', example: 2 },
                  enviado: { type: 'integer', example: 8 },
                  entregado: { type: 'integer', example: 24 },
                  cancelado: { type: 'integer', example: 3 },
                },
              },
              recientes: {
                type: 'array',
                items: { $ref: '#/components/schemas/Pedido' },
              },
            },
          },
          inventario: {
            type: 'object',
            description: 'Estado ACTUAL del catálogo y del stock; no depende del rango de fechas.',
            properties: {
              categorias: { type: 'integer', example: 6 },
              productos: { type: 'integer', example: 8 },
              productosActivos: { type: 'integer', example: 8 },
              destacados: { type: 'integer', example: 3 },
              stockBajo: { type: 'integer', example: 2, description: 'Productos activos con stock <= stock_minimo' },
              sinStock: { type: 'integer', example: 0 },
              valorVenta: { type: 'number', format: 'float', example: 1250000.00 },
              valorCosto: { type: 'number', format: 'float', example: 810000.00 },
              productosStockBajo: {
                type: 'array',
                items: { $ref: '#/components/schemas/Producto' },
              },
              movimientosRecientes: {
                type: 'array',
                items: { $ref: '#/components/schemas/MovimientoInventario' },
              },
            },
          },
          clientes: {
            type: 'object',
            properties: {
              total: { type: 'integer', example: 24 },
              activos: { type: 'integer', example: 22 },
              inactivos: { type: 'integer', example: 2 },
              nuevosEnPeriodo: { type: 'integer', example: 4 },
              topCompradores: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer', example: 3 },
                    nombre: { type: 'string', example: 'Rotisería La Esquina S.R.L.' },
                    pedidos: { type: 'integer', example: 7 },
                    total: { type: 'number', format: 'float', example: 48200.00 },
                  },
                },
              },
            },
          },
        },
      },
      MovimientoInventario: {
        type: 'object',
        description: 'Asiento del historial de stock. `cantidad` es siempre positiva; la dirección la da `tipo`.',
        properties: {
          id: { type: 'integer', example: 1 },
          producto_id: { type: 'integer', example: 1 },
          producto_sku: { type: 'string', example: 'VAS-PL-180' },
          producto_nombre: { type: 'string', example: 'Vaso plástico 180cc x100' },
          tipo: { type: 'string', enum: ['entrada', 'salida', 'ajuste'], example: 'salida' },
          cantidad: { type: 'integer', example: 10 },
          stock_anterior: { type: 'integer', example: 300 },
          stock_nuevo: { type: 'integer', example: 290 },
          motivo: { type: 'string', nullable: true, example: 'Venta - pedido PED-20260727-0001' },
          pedido_id: { type: 'integer', nullable: true, example: 1 },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      // Mensaje del formulario de contacto, completo.
      Contacto: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          nombre: { type: 'string', example: 'Lucía Ramírez' },
          email: { type: 'string', example: 'lucia@example.com' },
          telefono: { type: 'string', nullable: true, example: '998 268 132' },
          asunto: { type: 'string', nullable: true, example: 'Consulta por precios mayoristas' },
          mensaje: { type: 'string' },
          leido: {
            type: 'boolean',
            example: false,
            description: 'Único estado que define el schema: no hay respondido ni cerrado',
          },
          ip: { type: 'string', nullable: true, example: '190.234.10.5' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      // Fila del listado: trae un resumen en vez del mensaje completo.
      ContactoResumen: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          nombre: { type: 'string', example: 'Lucía Ramírez' },
          email: { type: 'string', example: 'lucia@example.com' },
          telefono: { type: 'string', nullable: true },
          asunto: { type: 'string', nullable: true },
          resumen: { type: 'string', description: 'Primeros 160 caracteres del mensaje' },
          recortado: { type: 'boolean', description: 'true si el mensaje completo es más largo' },
          leido: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      // --- Sitio público -----------------------------------------------------
      // Proyecciones recortadas: lo que NO figura acá no sale de la API pública.
      ProductoPublico: {
        type: 'object',
        description: 'Producto tal como lo ve un visitante. Sin costo, proveedor ni stock mínimo.',
        properties: {
          id: { type: 'integer', example: 1 },
          sku: { type: 'string', example: 'VAS-PL-180' },
          nombre: { type: 'string', example: 'Vaso plástico 180cc x100' },
          slug: { type: 'string', example: 'vaso-plastico-180cc-x100' },
          descripcion: { type: 'string', nullable: true },
          categoria_id: { type: 'integer', nullable: true },
          categoria_nombre: { type: 'string', nullable: true, example: 'Vasos' },
          categoria_slug: { type: 'string', nullable: true, example: 'vasos' },
          marca_nombre: { type: 'string', nullable: true },
          precio: { type: 'number', example: 3500 },
          stock: { type: 'integer', example: 240 },
          unidad_medida: { type: 'string', example: 'paquete' },
          unidades_por_paquete: { type: 'integer', nullable: true, example: 100 },
          imagen_url: { type: 'string', nullable: true },
          destacado: { type: 'boolean' },
        },
      },
      CategoriaPublica: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          nombre: { type: 'string', example: 'Vasos' },
          slug: { type: 'string', example: 'vasos' },
          descripcion: { type: 'string', nullable: true },
          imagen_url: { type: 'string', nullable: true },
          productos: { type: 'integer', description: 'Cantidad de productos activos', example: 12 },
        },
      },
      PedidoPublico: {
        type: 'object',
        description:
          'Confirmación que recibe el comprador. Sin ids internos, sin cliente_id ' +
          'ni usuario_id: solo lo que necesita para identificar su pedido.',
        properties: {
          numero: { type: 'string', example: 'PED-20260727-0001' },
          estado: { type: 'string', example: 'pendiente' },
          fecha_pedido: { type: 'string', format: 'date-time' },
          metodo_pago: { type: 'string', enum: ['efectivo', 'transferencia', 'yape', 'plin'], example: 'yape' },
          estado_pago: { type: 'string', example: 'pendiente' },
          cliente_nombre: { type: 'string', example: 'Lucía Ramírez' },
          direccion_entrega: { type: 'string', nullable: true, example: 'Av. Arequipa 1234' },
          distrito: { type: 'string', nullable: true, example: 'Miraflores' },
          referencia_entrega: { type: 'string', nullable: true, example: 'Frente al parque' },
          subtotal: { type: 'number', example: 7000 },
          total: { type: 'number', example: 7000 },
          detalle: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                descripcion: { type: 'string', example: 'Vaso plástico 180cc x100' },
                cantidad: { type: 'integer', example: 2 },
                precio_unitario: { type: 'number', example: 3500 },
                subtotal: { type: 'number', example: 7000 },
              },
            },
          },
        },
      },
      ConfiguracionPublica: {
        type: 'object',
        description: 'Datos de contacto de la empresa. Sin id ni marcas de tiempo.',
        properties: {
          nombre_empresa: { type: 'string', nullable: true, example: 'JAGN Solution' },
          logo_url: { type: 'string', nullable: true },
          email: { type: 'string', nullable: true },
          telefono: { type: 'string', nullable: true },
          whatsapp: { type: 'string', nullable: true },
          direccion: { type: 'string', nullable: true },
          ciudad: { type: 'string', nullable: true },
          provincia: { type: 'string', nullable: true },
          horario_atencion: { type: 'string', nullable: true },
          facebook: { type: 'string', nullable: true },
          instagram: { type: 'string', nullable: true },
          twitter: { type: 'string', nullable: true },
          tiktok: { type: 'string', nullable: true },
          moneda: { type: 'string', example: 'ARS' },
        },
      },
      // Datos de la empresa. Fila única (id siempre 1).
      Configuracion: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1, description: 'Siempre 1: la tabla es un singleton' },
          nombre_empresa: { type: 'string', example: 'JAGN Solution' },
          logo_url: { type: 'string', nullable: true, example: '/uploads/logos/1690000000-ab12.png' },
          email: { type: 'string', nullable: true, example: 'contacto@jagnsolution.com' },
          telefono: { type: 'string', nullable: true, example: '998 268 132' },
          whatsapp: { type: 'string', nullable: true, example: '998 268 132' },
          direccion: { type: 'string', nullable: true, example: 'Av. Los Álamos 123' },
          ciudad: { type: 'string', nullable: true, example: 'Lima' },
          provincia: { type: 'string', nullable: true, example: 'Lima' },
          horario_atencion: { type: 'string', nullable: true, example: 'Lun a Vie de 8 a 18 h' },
          facebook: { type: 'string', nullable: true },
          instagram: { type: 'string', nullable: true },
          twitter: { type: 'string', nullable: true },
          tiktok: { type: 'string', nullable: true },
          moneda: { type: 'string', example: 'ARS' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      // Lo que devuelven el detalle por id/número, la creación y los cambios de estado.
      PedidoConDetalle: {
        allOf: [
          { $ref: '#/components/schemas/Pedido' },
          {
            type: 'object',
            properties: {
              detalle: {
                type: 'array',
                items: { $ref: '#/components/schemas/DetallePedido' },
              },
            },
          },
        ],
      },
    },
  },
  // Por defecto, los endpoints no requieren auth salvo que lo declaren.
  tags: [
    { name: 'Auth', description: 'Autenticación y sesión' },
    { name: 'Categorías', description: 'Gestión de categorías' },
    { name: 'Productos', description: 'Gestión de productos' },
    { name: 'Clientes', description: 'Gestión de clientes' },
    { name: 'Pedidos', description: 'Gestión de pedidos y su detalle' },
    { name: 'Estadísticas', description: 'Métricas del panel administrativo' },
    { name: 'Configuración', description: 'Datos de la empresa (fila única)' },
    { name: 'Público', description: 'Sitio público: catálogo, checkout y contacto (sin autenticación)' },
    { name: 'Contacto', description: 'Bandeja de mensajes recibidos desde el sitio' },
  ],
}

export const swaggerSpec = swaggerJSDoc({
  definition,
  // Archivos donde swagger-jsdoc buscará los comentarios @openapi.
  apis: ['./src/routes/*.js'],
})
