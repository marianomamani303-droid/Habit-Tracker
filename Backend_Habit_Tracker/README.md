# Habit Tracker · backend de autenticación

API con Node.js, Express 5, MySQL y ES Modules. El frontend existente se mantiene
en su carpeta; este backend es un proyecto independiente.

```text
Habit Tracker/
├── Backend_Habit_Tracker/
│   ├── database/schema.sql
│   ├── src/
│   │   ├── config/{env,db,auth}.js
│   │   ├── controllers/authController.js
│   │   ├── middleware/{authMiddleware,errorHandler}.js
│   │   ├── routes/authRoutes.js
│   │   ├── services/authService.js
│   │   ├── utils/{HttpError,authValidation}.js
│   │   └── app.js
│   ├── tests/auth.test.js
│   ├── .env                    # local, ignorado por Git
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
└── Frontend_Habit_Tracker/
    └── frontend habit tracker/
```

El Dashboard y los cambios recientes se explican en [DASHBOARD.md](../DASHBOARD.md).
El sistema completo de hábitos, sus reglas y verificaciones se documenta en
[HABITOS.md](../HABITOS.md).

## Ejecutar en desarrollo

Requiere Node.js 20.19 o superior y un servidor MySQL en ejecución. Las
dependencias ya se instalaron en esta copia del proyecto. En otra máquina ejecuta
`npm install` dentro de cada proyecto.

### 1. Preparar MySQL

Abre MySQL Workbench, conecta con un usuario administrador y ejecuta
`database/schema.sql`. Crea la base `habit_tracker` y la tabla `usuarios` sin
eliminar tablas existentes. No es una migración de una tabla anterior: si ya tienes
una tabla con otro esquema, revisa sus columnas antes de usar esta API.

La tabla contiene `id`, `nombre`, `apellido`, `email`, `password_hash` y
`fecha_creacion`. `email` tiene un índice UNIQUE para impedir duplicados, incluso
si dos registros llegan al mismo tiempo.

Antes de iniciar la API, aplica también `database/migrations/001_session_revocations.sql`
en esa base. Con `.env` configurado puedes hacerlo mediante `npm run db:migrate`.
Es una migración aditiva e idempotente: crea `sesiones_revocadas` sin alterar
`usuarios`. Requiere permiso CREATE; puede ejecutarla un administrador y dejar
a la cuenta de aplicación con sus permisos habituales. La API comprueba que la
tabla existe antes de escuchar peticiones.

Puedes usar una cuenta de aplicación con permisos limitados. En Workbench,
reemplaza la contraseña del siguiente ejemplo por una propia antes de ejecutarlo:

```sql
CREATE USER 'habit_tracker_app'@'localhost' IDENTIFIED BY 'TU_CONTRASEÑA_MYSQL';
GRANT SELECT, INSERT, UPDATE, DELETE ON habit_tracker.*
TO 'habit_tracker_app'@'localhost';
```

Si esa cuenta ya existe, no ejecutes `CREATE USER` nuevamente. El administrador
crea la base; la cuenta de la aplicación no necesita permiso para crearla.

### 2. Configurar el backend

El archivo `.env` local ya incluye un secreto JWT generado aleatoriamente. No lo
subas a Git ni lo copies al frontend. Completa `DB_USER` y `DB_PASSWORD` con las
credenciales de tu instalación de MySQL.

En otra copia, empieza con `Copy-Item .env.example .env`. Genera un secreto nuevo
mediante:

```powershell
node --input-type=module -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(48).toString('hex'));"
```

Copia ese resultado en `JWT_SECRET` dentro de `.env` y mantenlo privado.

| Variable | Para qué sirve | Desarrollo |
| --- | --- | --- |
| `NODE_ENV` | Entorno; activa cookies Secure en producción | `development` |
| `PORT` | Puerto HTTP de Express | `3000` |
| `FRONTEND_URL` | Único origen de navegador permitido por CORS | `http://localhost:5173` |
| `DB_HOST` | Servidor MySQL | `127.0.0.1` |
| `DB_PORT` | Puerto MySQL | `3306` |
| `DB_USER` | Usuario MySQL de la aplicación | `habit_tracker_app` |
| `DB_PASSWORD` | Contraseña de esa cuenta MySQL | Tu valor local |
| `DB_NAME` | Base creada por el SQL | `habit_tracker` |
| `JWT_SECRET` | Secreto aleatorio usado para firmar y verificar JWT | Valor privado generado |
| `JWT_EXPIRES_SECONDS` | Duración del JWT y de la cookie, en segundos | `86400` (24 horas) |
| `COOKIE_SAME_SITE` | Política de envío de la cookie entre sitios | `lax` |

`FRONTEND_URL` es un origen exacto: sin ruta ni barra final. La configuración
valida las variables al iniciar para detectar errores antes de atender peticiones.
La expiración admitida va de 1 segundo a 7 días.

### 3. Iniciar la API

En una terminal dentro de `Backend_Habit_Tracker`:

```powershell
npm run dev
```

`node --watch` reinicia al editar archivos; `npm start` arranca sin observarlos.
`server.js` comprueba primero la conexión MySQL. Si falla, revisa el servicio,
las credenciales y la existencia de la base.

### 4. Iniciar React

En otra terminal dentro de `Frontend_Habit_Tracker/frontend habit tracker`:

```powershell
npm run dev -- --port 5173 --strictPort
```

El `.env` del frontend contiene:

```env
VITE_API_URL=http://localhost:3000/api
```

Esa URL es pública. Las variables `VITE_*` se incluyen en el JavaScript del
navegador: nunca pongas ahí credenciales MySQL o el secreto JWT. Reinicia Vite si
cambias su `.env`; en producción vuelve a compilar.

Abre `http://localhost:5173`. Usa `localhost` consistentemente en ambas URLs:
mezclarlo con `127.0.0.1` cambia el origen y puede impedir enviar cookies.

## Archivos y responsabilidades

| Archivo | Responsabilidad |
| --- | --- |
| `src/config/env.js` | Carga `.env` desde el backend y valida la configuración |
| `src/config/db.js` | Exporta el pool MySQL con la interfaz de promesas |
| `src/config/auth.js` | Comparte opciones de cookie/JWT y costo de bcrypt |
| `src/utils/authValidation.js` | Valida y normaliza inputs antes de consultar MySQL |
| `src/utils/HttpError.js` | Representa un error HTTP esperado con mensaje público |
| `src/services/authService.js` | Registra usuarios, busca cuentas y verifica contraseñas |
| `src/controllers/authController.js` | Recibe la petición y construye la respuesta; crea JWT/cookie |
| `src/middleware/authMiddleware.js` | Verifica el JWT de la cookie y genera `req.usuario` |
| `src/middleware/errorHandler.js` | Convierte errores en JSON sin SQL, secretos ni stack traces |
| `src/routes/authRoutes.js` | Asocia cada ruta con su middleware y controller |
| `src/app.js` | Configura Express, JSON, cookies, CORS, rutas y errores globales |
| `server.js` | Comprueba MySQL, arranca HTTP y cierra conexiones al detenerse |
| `database/schema.sql` | Crea la base y la tabla con email único |
| `tests/auth.test.js` | Prueba el flujo HTTP contra MySQL real en una base temporal |
| `.env` / `.env.example` | Configuración privada local / plantilla sin secretos |
| `.gitignore` | Excluye secretos, dependencias y logs |
| `package.json` / `package-lock.json` | Scripts, ES Modules, dependencias y versiones instaladas |

En el frontend se modificaron `registrarse.jsx`, `iniciar-sesion.jsx`, `App.jsx`,
`componentes/navbar.jsx`, `css/auth.css` y `.gitignore`. Se crearon
`services/authApi.js`, `pages/MiCuenta.jsx`, `.env` y `.env.example`.

Los formularios conservan sus campos, estados y diseño. Ahora muestran errores de
la API y deshabilitan el envío mientras esperan. Un registro exitoso conduce al
login con el email completado; un login exitoso conduce a `/dashboard` o a la ruta
privada solicitada originalmente. `AuthProvider` consulta `/me` y `ProtectedRoute`
protege el Dashboard. `/MiCuenta` redirige a `/dashboard/configuracion`, que conserva
la información del perfil. Un 401 redirige al login; una falla de red oculta los
datos privados y permite reintentar.

`authApi.js` centraliza fetch, mensajes de error, tiempo máximo de espera y
`credentials: "include"`. No guarda tokens ni identificadores de autenticación en
localStorage o sessionStorage. Se formatearon únicamente los archivos relacionados
con esta integración; no se agregó un formateador a las dependencias del proyecto.

## Las rutas

Todos los POST esperan `Content-Type: application/json`.

| Ruta | Middleware | Éxito | Errores esperados |
| --- | --- | --- | --- |
| `POST /api/auth/register` | JSON + límite de intentos | 201 + usuario público | 400 datos inválidos; 409 email duplicado; 429 demasiados intentos |
| `POST /api/auth/login` | JSON + límite de intentos | 200 + usuario público + cookie | 400 formulario inválido; 401 credenciales incorrectas; 429 |
| `GET /api/auth/me` | `authMiddleware` | 200 + usuario público + `expiresInMs` | 401 sin sesión, token inválido/expirado/revocado o usuario eliminado |
| `POST /api/auth/logout` | JSON | 200 + revocación persistente + cookie eliminada | 415 sin JSON; 500 si falla la persistencia |

Las respuestas exitosas de registro/login/me usan `{ usuario: { id, nombre,
apellido, email } }`. Los errores usan `{ mensaje: "..." }`. Los hashes y el JWT
no se incluyen en el JSON.

`app.js` monta el router bajo `/api/auth`. Por ejemplo, `/me` dentro del router se
convierte en `/api/auth/me`. Express 5 captura los rechazos de controllers async
y los pasa a `errorHandler`, que debe ser el último middleware.

## Cómo funciona cada parte

### 1. Pool y consultas

`db.js` usa `mysql2/promise`: podemos escribir `await pool.execute(...)` sin
callbacks. El pool mantiene hasta 10 conexiones y las reutiliza entre peticiones.
La cola está limitada para no acumular solicitudes indefinidamente.

```js
const [rows] = await pool.execute(
  "SELECT id, nombre, apellido, email FROM usuarios WHERE id = ? LIMIT 1",
  [id],
);
```

Los `?` son parámetros. Los valores externos se envían separados del SQL, evitando
que una comilla introducida en un input se interprete como parte de la consulta.

### 2. Registro, validaciones y hash

El controller llama a `registerUser(req.body)`. El servicio valida nombre,
apellido, email, contraseña y confirmación. Recorta espacios en nombres/email y
normaliza el email a minúsculas. No recorta la contraseña, porque los espacios
pueden formar parte de ella.

La contraseña debe tener al menos 8 caracteres y como máximo 72 bytes UTF-8.
El límite superior importa porque bcrypt ignora los bytes posteriores a 72;
los emojis pueden ocupar varios bytes. La confirmación es obligatoria en esta API.

`bcrypt.hash(password, 12)` genera un hash usando un salt aleatorio y un costo de
12 rondas. El salt y el costo forman parte del hash almacenado. Por eso dos cuentas
con la misma contraseña normalmente tienen hashes distintos. No es cifrado
reversible: no existe una función para recuperar la contraseña original.

Se guarda únicamente `password_hash`. La comprobación previa de duplicados ofrece
un mensaje claro y la restricción UNIQUE garantiza la integridad ante concurrencia.

### 3. Login y comparación

`loginUser()` busca por email mediante una consulta parametrizada.
`bcrypt.compare(password, password_hash)` comprueba si la contraseña recibida
corresponde al hash existente, reutilizando su salt y costo. Devuelve `true` o
`false`; no descifra el hash.

Si no existe el email, también se compara contra un hash de relleno para reducir
diferencias de tiempo. Tanto ese caso como una contraseña incorrecta responden
401 con `Email o contraseña incorrectos.`

### 4. JWT y cookie

El JWT se crea en `authController.js`, después de verificar las credenciales:

```js
const token = jwt.sign({ id: usuario.id }, config.jwtSecret, jwtOptions);
```

`jwt.sign()` firma los datos con el secreto mediante HS256. La firma permite
detectar cambios; el contenido del JWT no está cifrado. Su payload contiene `id`
y los claims estándar `jti` (identificador único), `iat` (emisión), `exp` (expiración), `iss` (emisor) y `aud`
(audiencia). No contiene contraseña, hash, nombre, email ni secreto.

`res.cookie()` manda una cabecera `Set-Cookie`. El navegador almacena el token
en `habitly_session`, con el mismo tiempo de vida que el JWT:

| Opción | Significado en este proyecto |
| --- | --- |
| `httpOnly: true` | JavaScript del navegador no puede leer la cookie mediante `document.cookie` |
| `secure` | En producción el navegador solo debe enviarla mediante HTTPS; en desarrollo local se permite HTTP |
| `sameSite: "lax"` | Restringe el envío en contextos entre sitios; sirve para localhost y despliegues que comparten sitio |
| `path: "/api"` | La cookie se envía a las rutas de la API |
| `maxAge` | Expiración de la cookie en milisegundos, sincronizada con la del JWT |

`credentials: "include"` permite al navegador enviar cookies y aceptar
`Set-Cookie` en las peticiones fetch entre frontend y API. No permite leer una
cookie HttpOnly ni evita las reglas de CORS/SameSite.

### 5. Middleware y usuario autenticado

`authMiddleware` lee `req.cookies.habitly_session`. Si no existe, responde 401.
Si existe, `jwt.verify()` comprueba firma, algoritmo permitido, emisor, audiencia
y expiración. El middleware también exige un `id` entero positivo y un `exp`.

Después consulta `sesiones_revocadas` por el hash SHA-256 del token y busca el
usuario por el ID firmado. Crea `req.usuario` con el perfil público actual y
ejecuta `next()`. Un usuario eliminado deja de acceder a cualquier endpoint que
use este middleware. `/me` devuelve ese perfil y la duración restante de la sesión.

Un ID enviado por React puede ser manipulado. El ID firmado y verificado proviene
de una sesión emitida por nuestro servidor. Las futuras rutas privadas deben
usar el mismo middleware y ese ID para consultar y modificar recursos del usuario.
La redirección de React ayuda a la experiencia de uso; la protección efectiva
está en el backend.

### 6. Logout

React envía `POST /api/auth/logout` con `{}` y cookies. Si el JWT sigue vigente,
el backend persiste su hash y expiración en `sesiones_revocadas`. Luego usa
`res.clearCookie()` con el mismo nombre, ruta, SameSite y Secure utilizados al
crearla. El navegador elimina la cookie y `/me` devuelve 401 en las peticiones
siguientes sin ella. Logout es idempotente: también funciona si ya expiró la sesión.

Una copia del token cerrado también se rechaza, incluso después de reiniciar
Express. Cada login genera un `jti` aleatorio para distinguir sesiones emitidas
en el mismo segundo. Si MySQL falla durante el logout, se responde 500 y no se
confirma un cierre incompleto. No se agregaron refresh tokens. Las revocaciones
expiradas pueden eliminarse con `DELETE FROM sesiones_revocadas WHERE expira_en <= UTC_TIMESTAMP()`;
no afectan nuevas sesiones y no se borran datos de usuarios.

### 7. CORS, JSON y límite de intentos

Solo el origen `FRONTEND_URL` recibe permiso de CORS y se habilitan credenciales.
Un origen de navegador distinto recibe 403. Las herramientas de terminal pueden
enviar peticiones sin `Origin`; CORS no reemplaza la autenticación.

Además, los POST requieren JSON. Esto impide que un formulario HTML externo
envíe una escritura simple con la cookie: las peticiones JSON entre orígenes
requieren una comprobación CORS previa. Se combina con la validación de Origin y
SameSite para proteger las escrituras actuales.

Se agregó solamente `express-rate-limit` además de las dependencias solicitadas:
registro y login comparten un límite de 20 peticiones por IP cada 15 minutos.
Responde 429 con `Retry-After`. El almacenamiento es en memoria; se reinicia con
el proceso y corresponde a un único servidor, acorde al alcance actual.

## Probar manualmente

Con MySQL, Express y Vite iniciados:

1. Abre `/Registro`. Envía campos vacíos: el navegador debe impedirlo.
2. Completa un usuario nuevo, con contraseña de 8 o más caracteres y confirmación
   idéntica. Debe navegar al login y mostrar el mensaje de cuenta creada.
3. Repite el mismo email en registro. Debe mostrar el error de email duplicado.
4. Prueba una contraseña incorrecta en login y un email inexistente. Ambos deben
   mostrar el mismo mensaje de credenciales incorrectas.
5. Inicia sesión correctamente. Debe navegar a `/dashboard` y mostrar tu bienvenida.
6. En DevTools → Application → Cookies, comprueba `habitly_session`, HttpOnly,
   SameSite=Lax, Path=/api y expiración. En HTTP local Secure está desactivado.
7. Recarga `/dashboard`. Debe conservar la sesión gracias a `/api/auth/me`.
8. Pulsa Cerrar sesión. La cookie debe desaparecer y `/me` responder 401.
9. Abre directamente `/MiCuenta` sin cookie. Debe redirigir al login.
10. Modifica el valor de la cookie a `token-invalido` en DevTools y vuelve a abrir
    `/MiCuenta`. Debe redirigir al login; `/me` debe responder 401.

Para probar los endpoints directamente desde DevTools en el frontend:

```js
const api = "http://localhost:3000/api/auth";

// Registro: usa un email nuevo y confirma la misma contraseña.
await fetch(`${api}/register`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    nombre: "María",
    apellido: "Prueba",
    email: "prueba@example.com",
    password: "UnHabitoCadaDia!",
    confirmar: "UnHabitoCadaDia!",
  }),
}).then(async res => ({ status: res.status, data: await res.json() }));

await fetch(`${api}/login`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "prueba@example.com", password: "UnHabitoCadaDia!" }),
}).then(async res => ({ status: res.status, data: await res.json() }));

await fetch(`${api}/me`, { credentials: "include" })
  .then(async res => ({ status: res.status, data: await res.json() }));

await fetch(`${api}/logout`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});

await fetch(`${api}/me`, { credentials: "include" })
  .then(res => res.status); // 401 tras logout
```

No intentes copiar el JWT desde la respuesta JSON: solo está en la cookie HttpOnly.

## Pruebas automatizadas

Dentro del backend:

```powershell
npm test
```

Necesita MySQL real y una cuenta de pruebas con permiso CREATE DATABASE.
Los tests crean bases nuevas con prefijos `habit_tracker_test_` y `habit_system_test_`
y las conservan al terminar; no ejecutan DROP. Nunca eliminan ni vacían la base
`DB_NAME` de la aplicación. El borrado de usuarios de prueba ocurre únicamente
dentro de su base aislada.

Para usar credenciales separadas puedes definir `TEST_DB_HOST`, `TEST_DB_PORT`,
`TEST_DB_USER` y `TEST_DB_PASSWORD` en la terminal antes de ejecutar `npm test`.
Si no están definidos, usa `DB_*` del `.env`. No necesitas cambiar la cuenta de
la aplicación para darle permisos administrativos.

Se verifican registro/hash, duplicados y concurrencia, validaciones, login,
cookie/JWT, `/me`, firma inválida, algoritmo incorrecto, token expirado, ausencia
de expiración, CORS, JSON, logout, usuario eliminado, límite de intentos y errores
MySQL sin información interna.

La implementación se verificó con MySQL 8.4 real en una instancia temporal,
separada del servicio MySQL84 instalado. También se comprobó el flujo de React en
un navegador con las cookies reales, incluida la persistencia tras recarga y el
logout. Esa instancia de pruebas no configura tu base habitual: completa tu `.env`
y ejecuta el SQL antes de usar el proyecto con ella.

El frontend se verifica con `npm run build` y `npm run lint`.

## Actualización integral de Habitly

La API incorpora subtareas con historial, frecuencias cada N días, estadísticas por período,
logros, perfil/foto, cambio y recuperación de contraseña, y recordatorios internos.
Aplicá `npm run db:migrate` antes de iniciar esta versión: agrega ocho tablas mediante
`003_habitly.sql`, sin alterar ni eliminar las tablas originales. Conservá tu `.env`.

SMTP es opcional para el resto de la aplicación y obligatorio para enviar enlaces de
recuperación. Consultá las variables `SMTP_*` en `.env.example`; sin host/remitente, se
informa 503 sin afirmar que se envió un correo.

Los tests crean bases separadas y las conservan. Para usar otra instancia, configurá
`TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER` y `TEST_DB_PASSWORD` en el proceso.
`npm run test:browser` requiere Edge/Chromium; `TEST_BROWSER_EXECUTABLE` permite indicar
el ejecutable instalado. `TEST_ARTIFACT_DIR` indica dónde guardar capturas.

Ver [informe integral](../HABITLY_ACTUALIZACION.md) y [auditoría](../AUDITORIA.md).

## Despliegue en producción

Configura `NODE_ENV=production`, un secreto propio, credenciales MySQL de permisos
limitados, `FRONTEND_URL=https://...` y `VITE_API_URL=https://.../api`. Frontend y API
deben usar HTTPS. Puedes usar el mismo dominio con `/api` detrás de un proxy, o
subdominios del mismo sitio, por ejemplo `app.ejemplo.com` y `api.ejemplo.com`:
`SameSite=lax` funciona en esas configuraciones.

Si están en sitios distintos, configura `COOKIE_SAME_SITE=none` en producción.
Esto exige Secure/HTTPS y sigue dependiendo de las restricciones del navegador
para cookies de terceros; compartir sitio es la opción más estable.

Si despliegas detrás de un proxy, configura `trust proxy` en Express según los
saltos/IPs de tu proveedor para que el límite de intentos identifique al cliente.
No actives `trust proxy=true` indiscriminadamente. No se configura aquí porque
todavía no existe un proveedor de despliegue definido.

## Referencias para estudiar

- [Pool y promesas de mysql2](https://sidorares.github.io/node-mysql2/docs)
- [bcrypt: hash, compare y límite de 72 bytes](https://github.com/kelektiv/node.bcrypt.js)
- [jsonwebtoken: sign y verify](https://github.com/auth0/node-jsonwebtoken)
- [Cookies: HttpOnly, Secure y SameSite](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)
- [CORS en Express](https://expressjs.com/en/resources/middleware/cors/)
- [Errores async en Express 5](https://expressjs.com/en/guide/error-handling/)
