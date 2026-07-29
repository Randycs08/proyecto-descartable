# Despliegue del backend en Railway

Guía para publicar la API de **JAGN Solution** en Railway con una base MySQL
del mismo proveedor.

Cubre **solo el backend**. El frontend en Vercel va después: el último paso de
esta guía deja preparado el hueco para su URL.

---

## Antes de empezar

- El repositorio tiene que estar en GitHub, con la rama que quieras desplegar
  ya empujada.
- `backend/.env` **no se sube** (está en `.gitignore`, tanto el de la raíz como
  el de `backend/`). En producción las variables se cargan en el panel de
  Railway, nunca en un archivo del repositorio.
- Vas a necesitar un cliente `mysql` en tu máquina para cargar el esquema.
  Si tenés MySQL local instalado, ya lo tenés.

---

## 1. Crear el servicio desde GitHub

1. En Railway: **New Project → Deploy from GitHub repo**.
2. Elegí el repositorio del proyecto.
3. Abrí el servicio recién creado → **Settings → Source**.
4. En **Root Directory** poné `backend`.

Esto es lo que hace que Railway vea `backend/package.json` y no la raíz del
repositorio. Con eso detecta Node y usa el script `start` que ya existe:

```json
"scripts": {
  "start": "node src/server.js",
  "dev": "nodemon src/server.js"
}
```

No hace falta Dockerfile ni Procfile. Tampoco un comando de build: el backend
no se compila.

> **No despliegues todavía.** Sin las variables de entorno el arranque va a
> fallar a propósito (ver paso 5). Si Railway lanza un despliegue automático al
> crear el servicio, dejalo fallar y seguí con los pasos.

---

## 2. Agregar la base de datos MySQL

En el mismo proyecto: **New → Database → Add MySQL**.

Railway crea un servicio llamado **MySQL** con sus propias variables
(`MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`).
No las copies a mano: en el paso siguiente se referencian.

Anotá el nombre exacto del servicio. Si Railway lo llamó distinto de `MySQL`,
hay que ajustar las referencias `${{MySQL.…}}` de abajo con ese nombre.

---

## 3. Generar el JWT_SECRET

En tu máquina:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Copiá la salida. Es el valor de `JWT_SECRET`.

Este secreto firma los tokens de sesión del panel: quien lo tenga puede
fabricar un token de administrador. No lo escribas en ningún archivo del
repositorio ni lo reutilices del `.env` local.

El servidor **rechaza arrancar en producción** si `JWT_SECRET` sigue teniendo
el valor de ejemplo de `.env.example`.

---

## 4. Cargar las variables

Servicio del backend → pestaña **Variables** → **Raw Editor**, y pegá el bloque
completo:

```
NODE_ENV=production
CLIENT_URL=http://localhost:5173
TRUST_PROXY=1

DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=descartables
DB_CONNECTION_LIMIT=10
DB_TIMEZONE=-05:00

JWT_SECRET=<pegar-el-secreto-generado-en-el-paso-3>
JWT_EXPIRES_IN=7d

UPLOAD_MAX_SIZE=5242880
```

Tres variables merecen explicación:

**`PORT` no está, y es a propósito.** Railway la inyecta sola y la app la lee
(`env.port`). Definirla a mano rompe el enrutado del proveedor.

**`TRUST_PROXY=1`** no estaba en la lista original pero hace falta. Railway
pone un proxy delante de la app; sin esto, `req.ip` es siempre la del proxy y
los cuatro rate limits cuentan a **todos los visitantes en un mismo contador**:
el límite público de 120 por minuto lo agotaría el conjunto del tráfico y el
sitio quedaría bloqueado para todos. Ponerlo en `1` fuera de un proxy real sería
lo contrario —permitiría esquivar los límites falsificando `X-Forwarded-For`—,
por eso el valor por defecto es `0`.

**`DB_NAME=descartables`, no `${{MySQL.MYSQLDATABASE}}`.** Los scripts de
`database/` crean y usan la base `descartables` (`CREATE DATABASE` + `USE` en
`schema.sql`, `seed.sql` y las migraciones), mientras que la referencia de
Railway resuelve a `railway`. Si dejaras la referencia, el esquema se cargaría
en `descartables` y la app se conectaría a `railway`, que estaría vacía: todo
respondería como si no existiera nada. El usuario que da Railway es `root`, así
que puede crear la base sin problema.

> Si preferís usar `${{MySQL.MYSQLDATABASE}}`, hay que quitar antes las líneas
> `CREATE DATABASE` y `USE descartables;` de los cuatro archivos SQL y cargarlos
> indicando la base en la línea de comandos. Es más idiomático en Railway, pero
> toca los scripts que hoy usás en local.

`CLIENT_URL` queda provisionalmente en `http://localhost:5173`; se corrige en el
paso 9. No la dejes vacía: es obligatoria en producción y sin ella el servidor
no arranca.

---

## 5. Desplegar

Railway redespliega solo al guardar las variables. Si no, **Deploy**.

En los logs tenés que ver:

```
✅ Conexión a MySQL establecida
🚀 Servidor escuchando en el puerto ####
   Entorno: production · Frontend permitido: ...
```

Si falta alguna variable crítica, el arranque falla con la lista completa de lo
que falta, en un solo mensaje:

```
❌ El servidor no pudo arrancar: Faltan variables de entorno obligatorias:
   DB_PASSWORD, CLIENT_URL. Con NODE_ENV=production no hay un valor por
   defecto seguro para ellas. Cargalas en el panel del proveedor...
```

En producción el servidor **tampoco arranca si MySQL no responde**. Es
deliberado: una API en pie sin base contesta 500 a todo mientras `/api/health`
sigue diciendo "ok", y el problema pasaría por bueno. Saliendo con error,
Railway reintenta.

---

## 6. Generar el dominio

Servicio del backend → **Settings → Networking → Generate Domain**.

Queda algo como `https://mi-backend-production.up.railway.app`. Anotalo: es la
URL que va a consumir el frontend.

En este punto la API responde, pero la base todavía está vacía.

---

## 7. Cargar esquema, datos iniciales y migraciones

Los scripts se ejecutan **una sola vez**, desde tu máquina, contra la base de
Railway.

En el servicio **MySQL** → pestaña **Variables**, buscá los datos de conexión
pública: `RAILWAY_TCP_PROXY_HOST` y `RAILWAY_TCP_PROXY_PORT` (el host interno
`mysql.railway.internal` solo funciona entre servicios de Railway, no desde
afuera). La contraseña es `MYSQLPASSWORD`.

Desde la raíz del proyecto, en orden:

```bash
# 1. Esquema (crea la base `descartables` y todas las tablas)
mysql -h <PROXY_HOST> -P <PROXY_PORT> -u root -p < database/schema.sql

# 2. Datos iniciales (roles, usuario admin, configuración de la empresa)
mysql -h <PROXY_HOST> -P <PROXY_PORT> -u root -p descartables < database/seeds/seed.sql
```

`schema.sql` ya incluye el resultado de las dos migraciones, así que en una base
nueva **no hace falta correrlas**. Se aplican solo sobre una base creada antes
de ellas:

```bash
mysql -h <PROXY_HOST> -P <PROXY_PORT> -u root -p descartables < database/migrations/001_pedidos_metodos_pago_y_entrega.sql
mysql -h <PROXY_HOST> -P <PROXY_PORT> -u root -p descartables < database/migrations/002_checkout_idempotencia.sql
```

Las dos son idempotentes: volver a correrlas no rompe nada.

> **Cambiá la contraseña del administrador.** El seed crea
> `admin@descartables.com` con `Admin123*`, que está publicada en el
> repositorio. Entrá al panel y cambiala antes de dar la URL a nadie.

---

## 8. Comprobar que funciona

```bash
curl https://<tu-dominio>.up.railway.app/api/health
```

Esperado:

```json
{"success":true,"message":"API operativa","data":{"status":"ok"}}
```

Y que la base está cargada:

```bash
curl https://<tu-dominio>.up.railway.app/api/public/configuracion
curl https://<tu-dominio>.up.railway.app/api/public/productos
```

Si `/api/health` responde pero las otras dos dan error, el esquema no se cargó
o `DB_NAME` no coincide con la base donde lo cargaste.

---

## 9. Después de desplegar el frontend

Cuando Vercel te dé la URL del frontend, volvé a **Variables** del backend y
reemplazá:

```
CLIENT_URL=https://<tu-frontend>.vercel.app
```

**Sin barra al final.** El navegador manda el origen sin ella y CORS compara
cadenas exactas. (El backend igual la recorta, pero mejor pegarla bien.)

En producción CORS acepta **únicamente** ese origen. Nunca `*`.

Railway redespliega solo al guardar.

---

## Cosas que conviene saber antes de usarlo en serio

### Las imágenes subidas se pierden en cada despliegue

El disco de Railway es efímero. Las fotos de productos, las de categorías y el
logo se guardan en `backend/uploads/`, y **ese directorio se borra en cada
redespliegue o reinicio**. Los registros quedan en la base apuntando a archivos
que ya no existen.

Para uso real hay que mover las imágenes a un almacenamiento externo
(Cloudinary, S3, o un volumen persistente de Railway). Todo lo que hay que
tocar está en `backend/src/middlewares/upload.middleware.js`, que concentra
dónde se guardan, cómo se nombran y cómo se borran.

Mientras tanto, el catálogo funciona: sin imagen se muestra un marcador
generado por el propio sitio.

### La documentación Swagger queda pública

`/api/docs` y `/api/docs.json` se sirven sin autenticación y describen la API
completa, incluidas las rutas del panel. No expone datos ni credenciales, pero
sí el mapa de la aplicación. Si preferís cerrarla en producción, es un cambio
de dos líneas en `backend/src/app.js`. Queda a tu criterio.

### Zona horaria

`DB_TIMEZONE=-05:00` fija la zona de la sesión de MySQL. Sin eso, el MySQL de
Railway corre en UTC y un pedido de las 19:30 de Lima se guardaría con fecha del
día siguiente, cayendo en el día equivocado del dashboard. Perú no tiene horario
de verano, así que el desfase es fijo todo el año.

---

## El desarrollo local no cambia

Nada de esto afecta a cómo venías trabajando:

```bash
cd backend
npm install
npm run dev
```

Con `backend/.env` y `NODE_ENV=development`, las variables siguen teniendo sus
valores por defecto (`localhost`, `root`, `descartables`, puerto 4000, CORS a
`http://localhost:5173`). La única obligatoria en local sigue siendo
`JWT_SECRET`, como antes.
