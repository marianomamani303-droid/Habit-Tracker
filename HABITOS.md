# Sistema de hábitos de Habit Tracker

Implementación sobre React, Express y MariaDB 10.4.32, sin sustituir la autenticación existente ni incorporar bibliotecas visuales. Verificación local: 8 de octubre de 2026.

## Funcionalidades

- Crear hábitos diarios, semanales o de días específicos con descripción, inicio, objetivo y unidad.
- Consultar todos, activos, archivados o completados hoy; abrir el detalle y editar.
- Archivar y restaurar sin eliminar hábitos ni registros.
- Registrar cantidades, marcar hábitos binarios y corregir registros históricos.
- Dashboard con datos reales, progreso diario, racha actual y mejor racha.
- Estadísticas por hábito y gráficos de los últimos 7 y 30 días con tabla accesible.
- Calendario mensual con navegación, detalle diario y corrección de cantidades.
- Estados de carga, errores, ausencia de datos y navegación responsive.

No se agregaron hábitos de demostración a la base principal. Los usuarios y hábitos empleados para verificar la implementación pertenecen a bases aisladas de pruebas.

## Arquitectura y responsabilidades

```text
Backend_Habit_Tracker/
  server.js                         Comprobaciones de esquema y arranque
  database/migrations/
    001_session_revocations.sql     Revocaciones de sesión existentes
    002_habits.sql                  Tablas nuevas de hábitos
  scripts/migrate.js                Ejecutor de migraciones
  src/
    app.js                         Express, CORS y montaje de rutas
    config/migrations.js           Aplicación ordenada e idempotente
    routes/habitRoutes.js           Endpoints privados y requisitos de JSON
    controllers/habitController.js  Traducción entre HTTP y servicios
    services/habitService.js        CRUD, reglas de edición, historial y estadísticas
    repositories/habitRepository.js SQL parametrizado, lectura y transacciones
    utils/habitCalendar.js          Calendario, frecuencias y rachas
    utils/habitValidation.js        Validación de fechas, cantidades e identificadores
  tests/
    auth.test.js                    Autenticación y errores
    habitCalendar.test.js           Reglas puras de calendario
    habits.test.js                  API con base real y dos cuentas
    dashboard.browser.js           Flujo React y sesiones
    helpers/habitBrowserFlow.js     CRUD, historial y seguridad desde navegador

Frontend_Habit_Tracker/frontend habit tracker/src/
  services/habitsApi.js             Peticiones con cookies y errores HTTP
  hooks/useDashboardHabits.js       Datos y actualización del Dashboard
  hooks/useHabitsResource.js        Carga reutilizable con protección contra respuestas obsoletas
  utils/habitCalendar.js            Fecha y zona horaria compartida de la interfaz
  componentes/habits/
    HabitCard.jsx                  Progreso y marcado binario
    HabitForm.jsx                  Formulario de creación/edición
    WeekdaySelector.jsx            Selección reutilizable de días
    ResourceState.jsx              Carga y errores
    TrendChart.jsx                 Gráfico responsive con alternativa tabular
  pages/
    Dashboard.jsx                  Inicio existente conectado a datos reales
    MisHabitos.jsx                 Listado, filtros y archivado
    HabitEditor.jsx                Crear/editar
    HabitDetail.jsx                Objetivos, rachas y registros recientes
    Estadisticas.jsx               Métricas y evolución
    Historial.jsx                  Calendario y correcciones
  css/habits.css                    Estilos separados y variables existentes
```

El flujo de una escritura es ruta → autenticación → controlador → validación/servicio → transacción/repositorio. El cálculo de calendario se puede probar sin una conexión a MySQL.

## Tablas y relaciones

| Tabla | Contenido y restricciones |
| --- | --- |
| `usuarios` | Tabla existente, sin alteraciones; propietario autenticado. |
| `sesiones_revocadas` | Tabla existente de hashes de tokens cerrados y vencimiento. |
| `habitos` | Identificador, propietario, nombre, descripción y creación. FK a `usuarios`, índice por propietario. |
| `habito_versiones` | Frecuencia, días ISO, cantidad de días semanales, objetivo, unidad, fecha inicial y estado desde una fecha efectiva. FK a `habitos`, UNIQUE hábito/fecha. |
| `habito_registros` | Cantidad absoluta de progreso por hábito/fecha. PK compuesta impide duplicados; FK a `habitos`, índice por fecha y restricción de cantidad no negativa. |

Los objetivos son DECIMAL con tres decimales. Las rachas y porcentajes se calculan desde versiones y registros; no se guardan contadores redundantes. No hay eliminación física ni cascadas destructivas.

## Calendario y cumplimiento

Todos los usuarios utilizan `America/Argentina/Buenos_Aires`. La API devuelve `fecha` y `zonaHoraria`; fechas de seguimiento y versiones son DATE `YYYY-MM-DD`, no instantes convertidos por el navegador. La aritmética emplea UTC internamente para evitar cambios por zona horaria o horario de verano. La interfaz consulta la misma zona, aunque Windows esté en otra.

Un registro representa la cantidad total realizada ese día, no un incremento. PUT reemplaza o corrige la cantidad; registrar cero desmarca. Está completo cuando cantidad ≥ objetivo vigente para esa fecha. Se rechazan fechas futuras, anteriores al inicio y días que no estaban programados. Se permiten correcciones hasta diez años atrás.

- **Diario:** un período por día activo, desde la fecha inicial.
- **Días específicos:** lunes=1 a domingo=7; únicamente los días seleccionados son períodos. Un martes libre no rompe una racha de lunes/miércoles/viernes.
- **Semanal:** semana de lunes a domingo. Cada día es una oportunidad; la meta indica cuántos días distintos deben alcanzar su objetivo diario. No se acumulan dos completados por repetir registros el mismo día. El período no falla mientras la semana esté abierta. En semanas parcialmente activas, el objetivo es el menor entre la meta configurada y los días activos disponibles.

La racha cuenta períodos consecutivos cumplidos. Un período actual abierto y todavía incompleto conserva la racha previa; pasa a incumplido después de cerrar. Días no programados o archivados se excluyen. Al mezclar frecuencias a lo largo de la vida del hábito, la racha conserva la secuencia de períodos; las cantidades se interpretan como períodos, no como una duración uniforme en días.

**Ediciones:** nombre y descripción cambian inmediatamente. Inicio es inmutable para proteger el historial. Objetivo, unidad, días y frecuencia cambian desde mañana; si el cambio involucra frecuencia semanal, desde el próximo lunes. Antes del inicio futuro pueden cambiar desde ese inicio. Una edición nueva sustituye los ajustes futuros pendientes sin modificar versiones pasadas. La interfaz muestra la fecha del cambio.

**Archivado/restauración:** efectivos desde mañana, o desde el inicio si es futuro; conservan la configuración futura y todo el historial. Hasta esa fecha el hábito sigue perteneciendo al filtro de su estado vigente. Esto evita reinterpretar el día que se está registrando. DELETE usa exactamente este archivado lógico.

## Denominadores y límites

El Dashboard muestra el porcentaje de oportunidades diarias que alcanzaron su objetivo. Para semanales, esa actividad diaria no equivale a declarar una semana incumplida; se muestra además su meta semanal. Sin hábitos programados, el porcentaje es null y se presenta como “—”.

El cumplimiento histórico por hábito compara períodos cumplidos con períodos cerrados más períodos actuales ya cumplidos. Los actuales todavía abiertos e incompletos no penalizan. Las semanas se evalúan como una unidad, sin dividirlas entre siete obligaciones diarias.

Los gráficos agrupan períodos por fecha de cierre: días anteriores, el día actual si está cumplido, y semanas al llegar a su cierre. Los días sin períodos evaluables tienen porcentaje null. No se incluyen como ceros en un promedio.

Límite de 100 hábitos por cuenta, incluido el archivo; límite de diez años de seguimiento retroactivo. El detalle/listado devuelve hasta 90 registros recientes por hábito y hasta 60 períodos recientes; el calendario permite consultar meses anteriores con límite de un mes por petición. Para períodos semanales que cruzan meses se leen los días adyacentes necesarios, sin perder actividad del mes anterior. Las rachas completas se calculan con el historial disponible, no solamente con los registros recientes enviados a la interfaz.

## Endpoints

Todas estas rutas requieren la cookie de sesión validada por el servidor:

| Método | Ruta `/api/habitos` | Operación |
| --- | --- | --- |
| GET | `/` | Listado; `estado=todos|activos|archivados|completados`. |
| POST | `/` | Crear. |
| GET | `/:id` | Detalle propio. |
| PUT | `/:id` | Editar campos y programar nueva definición. |
| PATCH | `/:id/estado` | `{archivado: true/false}`. |
| DELETE | `/:id` | Archivar, con cuerpo JSON `{}`. |
| PUT | `/:id/registros/:fecha` | `{cantidad: número}` absoluto, idempotente. |
| GET | `/resumen` | Dashboard. |
| GET | `/estadisticas` | Métricas y gráficos. |
| GET | `/historial?mes=YYYY-MM` | Calendario mensual y registros. |

Ejemplo de creación: `{nombre:"Leer", descripcion:"", frecuencia:"diario", inicio:"2026-10-08", objetivo:20, unidad:"páginas", dias:[], dias_semana:1}`. `dias` es un arreglo de enteros ISO, usado con frecuencia `dias`; `dias_semana` va de 1 a 7.

HTTP: 201 al crear, 200 en consultas/actualizaciones, 400 datos inválidos, 401 sesión ausente/expirada/revocada, 404 hábito ajeno o inexistente, 409 límite de cuenta, 415 escritura sin JSON. Errores internos conservan el manejo centralizado sin SQL ni credenciales en respuestas.

## Autenticación, autorización y seguridad

Se mantiene bcrypt para contraseñas y JWT firmado HS256 con emisor, audiencia y vencimiento. La cookie es HttpOnly, SameSite configurable y Secure en producción. No se guarda el token en localStorage ni se devuelve en JSON. El backend comprueba revocación persistida y existencia del usuario en cada operación privada.

`usuario_id` procede exclusivamente de `req.usuario.id`. Las consultas filtran por propietario; las escrituras bloquean primero el hábito con ID y propietario dentro de la transacción. El mismo 404 se utiliza para un hábito ajeno o inexistente. Manipular un ID no concede acceso.

Las escrituras requieren application/json; CORS acepta únicamente el origen configurado y permite PUT/PATCH/DELETE. Esto mantiene la defensa existente frente a formularios simples y orígenes ajenos. SQL usa parámetros; React presenta nombres y descripciones como texto escapado. Las respuestas privadas llevan Cache-Control: no-store.

Se corrigió el retorno desde login para las rutas privadas nuevas sin permitir destinos externos. También se evitó anunciar un arranque exitoso cuando el puerto está ocupado: EADDRINUSE ahora señala que debe comprobarse la instancia existente.

La cuenta y credenciales SQL de desarrollo se conservaron. No se crearon privilegios de producción ni se cambiaron contraseñas. Antes de un despliegue real deben usarse HTTPS y una cuenta SQL de permisos limitados, como ya documenta el README del backend.

## Migraciones, respaldo y error de arranque

La conexión principal usa `127.0.0.1:3307`, base `habit_tracker`; no MySQL Server 8.4 en 3306. Se inspeccionaron DB_* sin publicar contraseñas ni JWT_SECRET.

El ER_NO_SUCH_TABLE anterior provenía de `SELECT token_hash FROM sesiones_revocadas LIMIT 0` en server.js; la migración 001 ya lo resolvió. Ahora el servidor también comprueba las tres tablas de hábitos antes de escuchar. Las migraciones 001 y 002 están aplicadas en la base principal y pueden repetirse mediante `npm.cmd run db:migrate`. El ejecutor no recrea ni limpia la base y no ejecuta DROP.

Antes de aplicar 002 se exportó la base y se generó un SHA256:

`C:\Users\maria\Documents\XAMPP-Recovery\habit-system-before-migration-a11302cd2400483686e2b912408e3f39.sql`

El checksum está en el archivo adyacente `.sql.sha256`. Los respaldos anteriores de reparación MariaDB también siguen conservados. En una instalación distinta, preparar primero `database/schema.sql`, completar las credenciales existentes y aplicar las migraciones. El comando de migración no realiza un respaldo automático: generar y verificar uno antes de migrar otra instalación con datos existentes.

## Inicio

Primero iniciar MariaDB de XAMPP en 3307. En terminales separadas:

```powershell
cd "C:\Users\maria\OneDrive\Apps\Habit Tracker\Backend_Habit_Tracker"
npm.cmd start
```

```powershell
cd "C:\Users\maria\OneDrive\Apps\Habit Tracker\Frontend_Habit_Tracker\frontend habit tracker"
npm.cmd run dev
```

Frontend: http://localhost:5173. API: http://localhost:3000. Si ya están iniciados, no ejecutar otra instancia en esos puertos. `npm.cmd run dev` en backend usa Node watch. Ctrl+C detiene una instancia iniciada en la terminal.

## Verificación

Resultado final: **41 pruebas automatizadas aprobadas**, **build aprobado** y
**lint sin advertencias**. El flujo completo de navegador con Edge también pasó,
incluidos los formularios semanal/por días, marcado y desmarcado binario, cinco
tamaños de pantalla, sesión expirada y cierre de sesión persistente. La instancia
principal fue reiniciada con el código nuevo en el puerto 3000; `/api/habitos`
rechaza solicitudes sin sesión con 401. Las cinco tablas principales pasan
CHECK TABLE y no se agregaron hábitos de prueba a esa base.

`npm.cmd test` en backend: autenticación, calendario e integración SQL real, incluidas dos cuentas y manipulación de IDs. Las bases de pruebas son nuevas y separadas, con nombres `habit_tracker_test_*` o `habit_system_test_*`; se conservan al terminar para respetar la restricción de no ejecutar DROP. La prueba de usuario eliminado solo elimina una fila creada por el propio test dentro de su base aislada. Los errores simulados comprueban el manejo de fallos y no indican una caída de la base principal.

`npm.cmd run test:browser` usa Playwright opcional en una carpeta temporal y Edge; no agrega dependencias a la aplicación. Requiere NODE_PATH apuntando a esa instalación y TEST_BROWSER_EXECUTABLE al ejecutable de Edge. TEST_ARTIFACT_DIR permite guardar capturas. Se verifican registro/login, rutas protegidas, contenido oculto mientras se valida la sesión, CRUD, cantidades, frecuencias, calendario, gráficos, otras cuentas, recarga, errores, expiración y logout incluso tras reiniciar la API.

Frontend: `npm.cmd run build` y `npm.cmd run lint`. El código nuevo fue formateado con Prettier ejecutado temporalmente, sin agregarlo como dependencia de ejecución.

## Alcance pendiente y guía de lectura

Archivos **creados**: `HABITOS.md`; migración `002_habits.sql`; backend
`config/migrations.js`, `repositories/habitRepository.js`, `services/habitService.js`,
`controllers/habitController.js`, `routes/habitRoutes.js`, `utils/habitCalendar.js`,
`utils/habitValidation.js`, `tests/habitCalendar.test.js`, `tests/habits.test.js` y
`tests/helpers/habitBrowserFlow.js`; frontend `utils/habitCalendar.js`,
`hooks/useHabitsResource.js`, los cinco componentes de `componentes/habits/`,
`pages/HabitEditor.jsx`, `pages/HabitDetail.jsx`, `pages/Historial.jsx` y `css/habits.css`.

Archivos **modificados**: backend `server.js`, `src/app.js`, `scripts/migrate.js`,
`package.json`, `tests/auth.test.js`, `tests/dashboard.browser.js`, `.gitignore` y
`README.md`; frontend `src/App.jsx`, `services/habitsApi.js`,
`hooks/useDashboardHabits.js`, `componentes/dashboard/HabitsToday.jsx`,
`componentes/dashboard/Sidebar.jsx`, `componentes/dashboard/DashboardLayout.jsx`,
`pages/MisHabitos.jsx`, `pages/Estadisticas.jsx`, `pages/iniciar-sesion.jsx`; y
`DASHBOARD.md`. Los archivos de credenciales y las configuraciones de XAMPP no
fueron modificados durante este desarrollo.

No hay bloqueos para el flujo local de hábitos. Las siguientes ampliaciones no forman parte de la implementación: zona horaria configurable por usuario, recordatorios/notificaciones, exportación de informes, eliminación física y despliegue de producción. El límite de 100 hábitos y el análisis completo de rachas son adecuados para este alcance; para más volumen convendría procesamiento incremental sin duplicar estadísticas incorrectamente.

La tabla auxiliar `phpmyadmin.pma__recent` dañada durante la reparación previa de XAMPP sigue conservada y desactivada en phpMyAdmin; este trabajo no intentó recuperarla ni la usa.

Para comprender el sistema, empezar por `database/migrations/002_habits.sql`, `src/utils/habitCalendar.js` y sus pruebas; seguir con `habitRepository.js`, `habitService.js`, `habitRoutes.js` y `habitController.js`. En React, leer `services/habitsApi.js`, los hooks, `HabitForm.jsx`, `HabitCard.jsx` y las páginas. Para seguridad, estudiar `authMiddleware.js`, `sessionService.js`, `AuthProvider.jsx` y `ProtectedRoute.jsx`.
