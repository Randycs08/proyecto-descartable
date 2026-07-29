# JAGN Solution — Sistema de venta de descartables

Página web y panel de administración de **JAGN Solution**, empresa que vende productos descartables
(platos, vasos, cubiertos, envases, bolsas, etc.).

## Stack tecnológico

| Capa        | Tecnología                        |
|-------------|-----------------------------------|
| Frontend    | React + Vite + Tailwind CSS       |
| Backend     | Node.js + Express                 |
| Base de datos | MySQL                           |
| Autenticación | JWT (JSON Web Tokens)           |

## Estructura del proyecto

```
Proyecto-Descartable/
├── frontend/        # Aplicación React (Vite + Tailwind)
├── backend/         # API REST (Node.js + Express)
├── database/        # Scripts SQL, migraciones y seeds
└── README.md
```

## Puesta en marcha (resumen)

### Backend
```bash
cd backend
npm install
cp .env.example .env   # configurar variables
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env   # configurar variables
npm run dev
```

### Base de datos
Ejecutar los scripts en `database/` sobre una instancia de MySQL.

## Estado

| Módulo | Estado |
|--------|--------|
| Base de datos (schema + seed) | ✅ Completo |
| Backend: Auth + Categorías + Productos (JWT, Swagger, uploads) | ✅ Completo |
| Frontend: Login, panel, CRUD categorías/productos | ✅ Completo |
| Backend: Pedidos (alta con detalle, estados, cancelación) | ✅ Completo |
| Backend: Pedidos — stock e inventario (transaccional) | ✅ Completo |
| Backend: Clientes (CRUD, baja lógica, borrado seguro) | ✅ Completo |
| Frontend: Clientes (CRUD, filtros, baja lógica) | ✅ Completo |
| Backend: Estadísticas (resumen del panel) | ✅ Completo |
| Frontend: Dashboard con métricas reales | ✅ Completo |
| Frontend: Pedidos (alta, estados, detalle, cancelación) | ✅ Completo |
| Backend/Frontend: Configuración (empresa, contacto, redes, logo) | ✅ Completo |
| Backend: API pública (`/api/public/*`, solo lectura) | ✅ Completo |
| Sitio público: layout, home y catálogo con detalle | ✅ Completo |
| Sitio público: carrito, checkout y confirmación de pedido | ✅ Completo |
| Sitio público: contacto + bandeja de mensajes en el panel | ✅ Completo |
| Pagos en línea y despliegue | 🚧 Pendiente |

Ver los README de `backend/` y `frontend/` para el detalle de cada uno.
