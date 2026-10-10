# Dashboard de Habitly

El sistema de hábitos ya está integrado. La documentación actual de funcionalidades,
migraciones, API y reglas de calendario está en [HABITOS.md](HABITOS.md).
Las referencias siguientes a seguimiento todavía no disponible describen la etapa
inicial del Dashboard y quedan reemplazadas por esa implementación.

La aplicación conserva React/Vite/React Router, CSS separado y el backend
Node.js/Express/MySQL con rutas, controladores, servicios y middleware. No se
agregaron dependencias de ejecución ni se modificó la tabla `usuarios`.

## Preparación

En una base nueva ejecuta primero `Backend_Habit_Tracker/database/schema.sql`.
En una base existente conserva sus datos. En ambos casos, con el `.env` del
backend configurado, ejecuta:

```powershell
cd Backend_Habit_Tracker
npm run db:migrate
npm run dev
```

`db:migrate` prepara `sesiones_revocadas` y las tablas de hábitos. Puede repetirse. Si la cuenta
de aplicación no tiene permiso CREATE, un administrador debe ejecutar
`database/migrations/001_session_revocations.sql` en la base configurada.
La API verifica que la tabla existe al iniciar. Los `.env` existentes no se cambiaron.

En otra terminal, dentro de `Frontend_Habit_Tracker/frontend habit tracker`,
ejecuta `npm run dev -- --port 5173 --strictPort`.

## Rutas y componentes

| Ruta React | Contenido |
| --- | --- |
| `/dashboard` | Bienvenida, tarjetas, hábitos del día y progreso |
| `/dashboard/habitos` | Espacio para los hábitos, con estado vacío explícito |
| `/dashboard/estadisticas` | Resumen preparado e historial sin datos inventados |
| `/dashboard/configuracion` | Perfil actual de solo lectura |
| `/MiCuenta` | Redirección protegida al perfil; mantiene el enlace anterior |

`DashboardLayout` comparte el encabezado, fecha, sidebar, logout y datos mediante
`Outlet`. `Sidebar` tiene navegación activa y menú móvil con Escape. `StatsCards`,
`HabitsToday`, `DailyProgress`, `EmptyState` y `DashboardIcon` son reutilizables.
Los estilos mantienen la paleta verde, las variables y los patrones de las
páginas públicas. Incluyen foco visible, enlace para saltar al contenido y
respeto por la preferencia de movimiento reducido.

## Autenticación y seguridad

Se mantienen bcrypt y JWT firmado HS256 en `habitly_session`. La cookie es
HttpOnly, Path=/api, SameSite=lax por defecto y Secure en producción. React
reutiliza `authApi` con `credentials: include`; no guarda JWT en localStorage.
El login agrega un `jti` aleatorio, sin cambiar los campos de usuario.

`GET /api/auth/me` reutiliza `authMiddleware`, que valida firma, algoritmo,
emisor, audiencia, expiración, revocación persistente y existencia del usuario.
Devuelve `{ usuario: { id, nombre, apellido, email }, expiresInMs }` con no-store.
El perfil se obtiene exclusivamente por el ID del JWT; se ignoran IDs enviados
en la URL o el body. Las consultas usan parámetros.

`AuthProvider` comprueba la sesión al iniciar, cambiar de ruta, recuperar el foco
y cada minuto mientras la página es visible y hay una sesión activa. Programa
también el vencimiento con la duración enviada por el servidor. Descarta
respuestas de verificaciones anteriores para evitar restaurar una sesión después
de logout o durante una navegación.

`ProtectedRoute` espera esa comprobación antes de montar el Dashboard. Durante
la carga y los errores no hay contenido privado. Un 401 redirige al login con
la ruta solicitada; un error de red/servidor muestra un botón para reintentar.
Un usuario autenticado que abre el login vuelve al Dashboard.

`POST /api/auth/logout` conserva la ruta existente y sigue siendo idempotente.
Primero guarda un digest SHA-256 del token vigente y su expiración en MySQL;
después elimina la cookie. El token revocado se rechaza incluso si se vuelve a
enviar o se reinicia Express. Si falla MySQL, no se comunica un éxito falso y
el usuario puede reintentar. No guarda cookies o JWT en texto plano.
La revocación sigue el enfoque descrito por
[OWASP](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html).

No se agregaron endpoints privados ficticios de hábitos. Cualquier endpoint
futuro debe montar `authMiddleware` y consultar por `req.usuario.id` además del
ID del recurso: por ejemplo `WHERE id = ? AND usuario_id = ?`. React por sí solo
no protege datos del servidor. Se mantienen las comprobaciones de Origin/CORS,
JSON para escrituras y el límite de intentos de login/registro.

## Integración de hábitos pendiente

El proyecto actualmente solo tiene la tabla `usuarios`; no hay tablas ni
endpoints de hábitos o cumplimiento. `services/habitsApi.js` marca esta ausencia
con `{ disponible: false, habitos: [], estadisticas: null }`. Las tarjetas
muestran “— / Sin datos disponibles”, el indicador no muestra un porcentaje y
la pantalla explica que el seguimiento todavía no está disponible. No interpreta
la ausencia de API como cero hábitos del usuario.

`useDashboardHabits` contempla carga, error con reintento, sesión inválida,
funcionalidad no disponible y respuesta real vacía. Cuando exista la API,
reemplaza únicamente el adaptador por un fetch autenticado. El contrato previsto
para una respuesta disponible es:

```text
disponible: true
habitos: [{ id, nombre, descripcion, completadoHoy }]
estadisticas: { totales, completadosHoy, pendientesHoy, cumplimiento }
```

`habitos` representa los programados para hoy; `totales` representa la rutina
completa. El servidor debe calcular pendientes y cumplimiento para la fecha/zona
horaria elegida, sin aceptar un ID de usuario del cliente. Si no hay hábitos
para hoy, no se interpreta eso como 100% de cumplimiento.

Quedan pendientes el esquema/CRUD de hábitos, los registros diarios, los cálculos
reales, el historial y la edición de perfil/preferencias. No hay botones que
simulen guardar o completar hábitos. Las revocaciones ya expiradas pueden
limpiarse periódicamente con:

```sql
DELETE FROM sesiones_revocadas WHERE expira_en <= UTC_TIMESTAMP();
```

## Archivos creados y modificados

Rutas relativas a `Frontend_Habit_Tracker/frontend habit tracker/`:

- Creados: `src/context/AuthContext.js`, `src/context/AuthProvider.jsx`,
  `src/hooks/useAuth.js`, `src/hooks/useDashboardHabits.js`,
  `src/services/habitsApi.js`, `src/componentes/ProtectedRoute.jsx`.
- Creados en `src/componentes/dashboard/`: `DashboardLayout.jsx`, `Sidebar.jsx`,
  `StatsCards.jsx`, `HabitsToday.jsx`, `DailyProgress.jsx`, `EmptyState.jsx`,
  `DashboardIcon.jsx`.
- Creados: `src/pages/Dashboard.jsx`, `src/pages/MisHabitos.jsx`,
  `src/pages/Estadisticas.jsx`, `src/css/dashboard.css`, `src/css/session.css`.
- Modificados: `src/App.jsx`, `src/main.jsx`, `src/pages/iniciar-sesion.jsx`,
  `src/pages/MiCuenta.jsx`, `src/componentes/navbar.jsx`, `src/css/variables.css`,
  `README.md`.

Rutas relativas a `Backend_Habit_Tracker/`:

- Creados: `src/services/sessionService.js`,
  `database/migrations/001_session_revocations.sql`, `scripts/migrate.js`,
  `tests/dashboard.browser.js`.
- Modificados: `src/middleware/authMiddleware.js`,
  `src/controllers/authController.js`, `server.js`, `package.json`,
  `tests/auth.test.js`, `README.md`.
- Creado en la raíz común: `DASHBOARD.md`.

Los endpoints modificados son login, me y logout. Registro se reutiliza.
`database/schema.sql`, las tablas actuales y las dependencias se conservan.

## Verificaciones

Verificado el 8 de octubre de 2026: build y lint sin advertencias, 17 pruebas
HTTP/MySQL aprobadas y el recorrido de navegador completo con Edge. Las pruebas
usaron una instancia temporal de MySQL 8.4, separada del servicio y la base de
la aplicación. Se revisaron capturas de escritorio y móvil.

Frontend: `npm run lint` y `npm run build`.
Backend: `npm test` usa bcrypt/JWT/MySQL reales y crea exclusivamente
bases aisladas de prueba que se conservan al terminar. Requiere CREATE DATABASE;
no ejecuta DROP ni limpia la base de la aplicación.
Se ampliaron los casos para identidad de dos usuarios, duración de sesión,
revocación persistente, logout repetido y rechazo del token copiado.

`npm run test:browser` inicia Express/Vite en puertos de pruebas, usa una base
temporal aislada y cierra los procesos al terminar. Comprueba rutas privadas,
registro/login, ocultamiento durante verificación, recarga, navegación, menú
móvil, cinco anchos de pantalla, errores de servidor/logout, rechazo del token
tras reiniciar la API, revocación externa y expiración real de JWT. No usa la
base de la aplicación. Playwright es solo una herramienta de prueba opcional:

```powershell
$dashboardTestTools = Join-Path $env:TEMP 'habit-dashboard-test-tools'
npm install --prefix $dashboardTestTools playwright
$env:NODE_PATH = Join-Path $dashboardTestTools 'node_modules'
$env:TEST_BROWSER_EXECUTABLE = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$env:TEST_DB_HOST = '127.0.0.1'
$env:TEST_DB_PORT = '3306'
$env:TEST_DB_USER = 'TU_USUARIO_DE_PRUEBAS'
$env:TEST_DB_PASSWORD = 'TU_PASSWORD_DE_PRUEBAS'
npm run test:browser
```

El comando se ejecuta dentro del backend. Ajusta la ruta de Edge o usa Chromium
instalado por Playwright. Puertos alternativos: `TEST_FRONTEND_PORT` y
`TEST_BACKEND_PORT`. `TEST_ARTIFACT_DIR` permite guardar capturas opcionales.

## Orden sugerido de estudio

1. `src/App.jsx` del frontend: rutas públicas y privadas.
2. `src/context/AuthProvider.jsx` y `src/componentes/ProtectedRoute.jsx`: sesión
   compartida, carga, expiración y redirección.
3. `src/componentes/dashboard/DashboardLayout.jsx` y `src/pages/Dashboard.jsx`:
   composición del Dashboard y componentes.
4. `src/services/habitsApi.js`: punto concreto para integrar datos reales.
5. `src/middleware/authMiddleware.js`, `src/services/sessionService.js` y
   `src/controllers/authController.js` del backend: verificación y revocación.
6. Migración SQL, pruebas y `src/css/dashboard.css`.
