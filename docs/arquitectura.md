# Arquitectura y base de datos

Habitly separa el frontend React/Vite de la API Express. Cada proyecto tiene su
propio `package.json` y `package-lock.json`; los comandos se ejecutan dentro del
directorio correspondiente. El inicio local está en el [README principal](../README.md).

## Flujo y responsabilidades

El frontend envía peticiones mediante `services/{authApi,habitsApi,experienceApi}.js`,
con cookies y manejo de errores. `AuthProvider` comparte la sesión y
`ProtectedRoute` espera su comprobación antes de montar las pantallas privadas.
Los hooks `useDashboardHabits`, `useHabitsResource` y `useNotifications` gestionan
carga, reintentos y actualización de datos.

En la API, el flujo es ruta → middleware → controlador → servicio → SQL.
Los controladores traducen HTTP; los servicios aplican reglas y validaciones.
`habitRepository.js` concentra consultas y transacciones de hábitos.
Las escrituras bloquean el hábito con su propietario dentro de la transacción.

| Ubicación en el backend | Responsabilidad |
| --- | --- |
| `src/app.js` | Express, CORS, límites JSON, cookies, routers y errores |
| `server.js` | Comprobar conexión/tablas, escuchar HTTP y cerrar conexiones |
| `src/config/{env,db,auth}.js` | Configuración validada, pool SQL y opciones de sesión |
| `src/routes/`, `src/controllers/` | Endpoints de autenticación, hábitos y experiencia |
| `src/services/` | Autenticación, revocación, hábitos, subtareas, perfil, recuperación, medallas y recordatorios |
| `src/repositories/habitRepository.js` | Lecturas, escrituras y transacciones de hábitos |
| `src/utils/` | Calendario, estadísticas, logros y validación |
| `database/`, `scripts/migrate.js` | Esquema base y migraciones |
| `tests/` | Reglas, integración SQL y recorridos de navegador |

En React, `DashboardLayout` compone encabezado, navegación y páginas mediante
`Outlet`. Los componentes se agrupan en `componentes/dashboard`, `habits`,
`profile` y `visual`. Los estilos son CSS modular, con tokens en `css/variables.css`.

## Modelo de datos

| Tabla | Contenido |
| --- | --- |
| `usuarios` | Identidad, email único y hash de contraseña |
| `sesiones_revocadas` | Digest de sesión cerrada y vencimiento |
| `habitos` | Propietario, nombre y descripción |
| `habito_versiones` | Objetivo, unidad, frecuencia, inicio y estado con vigencia |
| `habito_registros` | Cantidad absoluta por hábito/fecha; clave única compuesta |
| `usuario_perfiles` | Biografía, zona horaria, avatar privado y versión de sesión |
| `password_recuperaciones` | Digest del token, propietario, expiración y consumo |
| `habito_reglas` | Intervalo cada N días asociado a una versión |
| `habito_subtareas` | Pasos con fechas de inicio y fin de vigencia |
| `subtarea_registros` | Estado por subtarea/fecha |
| `usuario_logros` | Medallas únicas y permanentes por usuario |
| `habito_recordatorios` | Horario y activación por hábito |
| `usuario_notificaciones` | Avisos únicos por hábito/fecha/hora y estado leído |

Las rachas y porcentajes se calculan a partir de versiones y registros. Archivar
conserva el historial; terminar una subtarea finaliza su vigencia. Los objetivos
usan cantidades con hasta tres decimales.

## Esquema y migraciones

[schema.sql](../Backend_Habit_Tracker/database/schema.sql) prepara `habit_tracker`
y `usuarios`. El migrador usa la base indicada por `DB_NAME` y aplica, en orden:

1. [001_session_revocations.sql](../Backend_Habit_Tracker/database/migrations/001_session_revocations.sql): revocación persistente.
2. [002_habits.sql](../Backend_Habit_Tracker/database/migrations/002_habits.sql): hábitos, versiones y registros.
3. [003_habitly.sql](../Backend_Habit_Tracker/database/migrations/003_habitly.sql): perfiles, recuperación, subtareas, intervalos, medallas y recordatorios.

Los archivos actuales son aditivos e idempotentes. El ejecutor lee todos los `.sql`
ordenados por nombre y los vuelve a aplicar en cada ejecución; no lleva una tabla
de versiones aplicadas. Mantener esa propiedad al agregar migraciones.
El ejecutor separa sentencias por `;`: no admite directamente procedimientos o
scripts con delimitadores especiales.

Para una base existente, comprobar la compatibilidad del esquema y generar un
respaldo verificado antes de migrar. El comando no realiza respaldos. La cuenta
que migra necesita permisos de creación de tablas; un administrador puede aplicar
las migraciones y dejar la cuenta de ejecución con permisos limitados.

## Guía de mantenimiento

Para modificar reglas, empezar por `src/utils/habitCalendar.js`,
`statisticsRules.js` y sus pruebas; seguir por repositorio, servicio y controlador.
En React, revisar el servicio de API, los hooks y la página correspondiente.
Cambios de autenticación requieren revisar middleware, `sessionService.js`,
`AuthProvider` y `ProtectedRoute`. Consultar [seguridad](seguridad.md) y [pruebas](pruebas.md).
