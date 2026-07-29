# Frontend — JAGN Solution

Panel administrativo y sitio público de **JAGN Solution**, en **React + Vite + Tailwind CSS**, con un
sistema de componentes propio inspirado en **shadcn/ui** (tokens por variables
CSS, `class-variance-authority`, `tailwind-merge`, `lucide-react`).

## Características

- **Login** conectado a la API con manejo de errores.
- **Protección de rutas** por JWT (`ProtectedRoute`) + verificación de sesión.
- **Layout** completo: Sidebar responsive, Navbar con menú de usuario y Footer.
- **Dashboard** con métricas reales: ventas del período comparadas contra el
  anterior, pedidos por estado, productos por reponer, clientes e inventario
  valorizado. Selector de período y vista reducida para el rol Vendedor.
- **CRUD de Categorías**, **Productos** y **Clientes** (tabla con búsqueda,
  filtros, paginación, modales de crear/editar y confirmación de borrado).
- **Pedidos**: alta con buscador de clientes y productos, máquina de estados
  (solo se ofrecen las transiciones válidas), ficha de detalle y cancelación
  con motivo. La cancelación solo se muestra a los roles que la API autoriza.
- **Configuración**: datos de la empresa con vista previa del logo actual y del
  nuevo. Solo el Administrador puede editar; el Empleado lo ve en solo lectura.
- **Axios con interceptores** (adjunta el token, maneja 401, normaliza errores).
- **Context API** para autenticación (`AuthContext` + `useAuth`).
- **Toasts** (react-hot-toast) y **skeletons** de carga.
- **Sitio público**: layout propio (header con carrito y WhatsApp, footer con los
  datos de configuración), portada y catálogo con búsqueda, filtros, orden,
  paginación y ficha de producto. Consume solo `/api/public/*`.
- **Contacto**: página pública con los datos reales de la empresa (cada bloque se
  oculta si no hay dato cargado) y formulario que se limpia solo tras confirmar
  el envío. En el panel, bandeja de mensajes con marcado de leído.
- **Flujo de compra**: carrito persistente en `localStorage`, checkout con datos
  de persona o empresa, y confirmación con el número de pedido. El checkout
  vuelve a consultar cada producto antes del resumen —el carrito puede tener
  días— y el carrito se vacía únicamente cuando la API confirmó el pedido.

## Estructura

```
src/
├── components/
│   ├── ui/          Primitivas (Button, Input, Modal, Table, Badge, Card, …)
│   ├── common/      Compuestos (PageHeader, Toolbar, ConfirmDialog, FormField,
│   │                Autocomplete, …)
│   ├── layout/      Sidebar, Navbar, Footer, AdminLayout,
│   │                PublicLayout, PublicHeader, PublicFooter
│   ├── categorias/  CategoriaForm
│   ├── productos/   ProductoForm
│   ├── clientes/    ClienteForm
│   ├── pedidos/     PedidoForm, PedidoDetalle
│   ├── dashboard/   StatCard, DashboardVendedor
│   └── publico/     ProductoCard, ProductoDetalleModal, CarritoPanel
├── context/         AuthContext (sesión/JWT), CarritoContext (localStorage)
├── hooks/           useAuth, useCarrito, useDebounce
├── lib/             utils (cn, formatos), toast
├── services/        api (axios+interceptores), auth/categoria/producto/
│                    cliente/pedido/estadistica/configuracion/publico
├── pages/
│   ├── admin/       Dashboard, Categorias, Productos, Clientes, Pedidos,
│   │                Contactos, Configuracion, ComingSoon
│   ├── public/      Home, Catalogo, Checkout, PedidoConfirmado, Contacto
│   ├── Login.jsx
│   └── NotFound.jsx
├── routes/          AppRouter, ProtectedRoute
├── constants/       navigation
├── App.jsx          Providers (Router + Auth + Toaster)
└── main.jsx
```

## Puesta en marcha

```bash
cd frontend
npm install
cp .env.example .env      # opcional (por defecto usa el proxy /api)
npm run dev               # http://localhost:5173
```

> Requiere el **backend** corriendo en `http://localhost:4000` (Vite hace proxy
> de `/api` y `/uploads`). Iniciar sesión con `admin@descartables.com` / `Admin123*`.

## Scripts

| Script          | Descripción                        |
|-----------------|------------------------------------|
| `npm run dev`   | Servidor de desarrollo (HMR)       |
| `npm run build` | Build de producción (`dist/`)      |
| `npm run preview` | Previsualiza el build            |
| `npm run lint`  | Linter (ESLint)                    |

## Contenido real pendiente

El sitio funciona con lo que hay cargado, pero **hoy no existe ni una sola
imagen**: los 8 productos y las 6 categorías tienen `imagen_url` en `null` y las
carpetas de `backend/uploads/` están vacías. Mientras eso siga así, el catálogo
muestra el marcador de `ImagenProducto` (fondo de color derivado del nombre +
ícono por rubro + inicial). Es deliberado y se ve prolijo, pero **no reemplaza a
una foto**.

Lo que tiene que entregar el dueño del negocio, por orden de impacto:

| Qué | Dónde se carga | Por qué importa |
|-----|----------------|-----------------|
| **Foto por producto** (cuadrada, mín. 800×800, fondo claro) | Panel → Productos | Es lo que más cambia la percepción del sitio |
| **Imagen por categoría** (cuadrada) | Panel → Categorías | Da identidad a la portada |
| **Logo** (PNG con fondo transparente, mín. 200×200) | Panel → Configuración | Hoy se usa la inicial sobre el color de marca |
| **Teléfono fijo** | Panel → Configuración | Sigue en `+51 XXX XXX XXX` |
| Dirección, ciudad y horario reales | Panel → Configuración | Los bloques se ocultan si faltan |

### Qué sigue siendo temporal

- **Textos del sitio**: los titulares, los cuatro beneficios y las descripciones
  de sección son genéricos del rubro. No inventan datos (no hay porcentajes de
  descuento ni "clientes satisfechos"), pero convendría reescribirlos con la voz
  del negocio.
- **Franja de cifras de la portada**: muestra cantidad de productos y categorías
  tomadas del catálogo real; las otras dos columnas son afirmaciones cualitativas
  sin número.
- **No hay sección de promociones**: el backend no tiene precios promocionales ni
  campañas, y ponerlas fijas en el código sería inventar una oferta. Requiere
  soporte de datos antes de existir.

## Sistema de diseño

Los colores y el radio se definen como variables CSS en `src/index.css`
(`--primary`, `--background`, etc.) y Tailwind los consume vía
`hsl(var(--token))`. Cambiar el tema (o activar modo oscuro con la clase `dark`)
no requiere tocar los componentes.

- **Primario**: verde esmeralda. Se reserva para acciones y estado.
- **`--brand-accent`** (naranja): lo comercial — ofertas, contador del carrito,
  "últimas unidades". Si el verde también destacara precios, todo competiría por
  la atención y nada resaltaría.
- **`--brand-deep`**: tono profundo para el hero, la franja de cierre y el pie.
- **Tipografía**: pila del sistema, sin webfont — carga instantánea y sin
  parpadeo. Cambiar a una fuente de marca es una línea en `index.css`.
- **Sombras** `soft` / `card` / `elevada`: más suaves que las de Tailwind, que
  resultan duras sobre fondo claro.
- **`.container-site`**: ancho máximo del sitio público (80rem). Sin tope, en un
  monitor ancho las secciones se estiran y el contenido queda flotando.
