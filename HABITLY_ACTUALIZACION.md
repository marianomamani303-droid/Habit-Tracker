# Habitly — informe de actualización integral

Fecha: 9 de octubre de 2026.

Se amplió la aplicación existente React/Vite/React Router + Express/MySQL. Se conservaron la autenticación, los servicios, el repositorio, las rutas anteriores, las variables CSS, los objetivos cuantitativos, el archivo/restauración y el historial con versiones. No se reconstruyó el proyecto ni se cambiaron archivos `.env` o credenciales de la aplicación.

## Funcionalidades implementadas

- Frecuencias diarias, semanales flexibles, semanales con días específicos y personalizadas cada N días (1–365), con validación y edición versionada. Las nuevas reglas se anclan en la fecha inicial y no alteran los períodos anteriores.
- Subtareas: crear, renombrar, finalizar vigencia y completar por fecha. Todas las subtareas activas deben estar completas para cumplir el hábito; completarlas actualiza proporcionalmente el objetivo cuantitativo. Marcar el hábito completo completa todos sus pasos; desmarcarlo los reinicia. Los registros son únicos y las escrituras se realizan en una transacción con bloqueo del hábito y autorización por propietario.
- Agregar subtareas a un hábito con historial rige desde mañana; un hábito recién creado puede tener pasos hoy. Eliminarlas finaliza su vigencia desde mañana y conserva los registros. El calendario permite corregir las subtareas de la fecha consultada.
- Estadísticas semanales, mensuales, anuales y rangos de hasta 366 días. Gráfico interactivo con teclado, selección y tabla accesible. Totales reales, porcentajes y estados sin actividad. Los hábitos diarios cuentan solo en fechas programadas; las cuotas flexibles cuentan como una obligación por semana, asignada al domingo. El día pendiente actual entra en el denominador y los días futuros no cuentan. Las rachas generales conservan la semántica anterior de períodos cerrados.
- Seis medallas persistentes: primera finalización, rachas de 7 y 30 días programados, 50 y 100 finalizaciones y una semana completa perfecta. Los días libres no interrumpen rachas; las cuotas semanales mantienen rachas por semana. Las medallas de racha diaria requieren días programados, sin convertir semanas en días. Los desbloqueos son permanentes y únicos, con fecha, requisitos, progreso y animación.
- Perfil editable: nombre, apellido, biografía y zona horaria IANA. Foto privada guardada en MySQL, sin servicio externo. JPEG/PNG/WebP hasta 2 MB y 16 megapíxeles; comprobación de contenido, decodificación y nueva codificación a WebP 256×256 sin metadatos ni contenido anexado.
- Cambio de contraseña con verificación de la actual y revocación de todas las sesiones mediante una versión persistente. Recuperación con token aleatorio, digest SHA-256, vencimiento de 30 minutos, consumo atómico de un solo uso, límite de intentos y respuestas independientes de la existencia del correo. El token viaja en un fragmento del enlace y se elimina de la URL al abrir el formulario.
- Recordatorios internos por hábito/hora, evaluados por el backend según la zona horaria del usuario. Se recuperan hasta siete días recientes desde la activación. Unicidad por hábito/fecha/hora, estado leído persistente, contador, lista y marcado individual o general. El cliente consulta al ingresar, recuperar foco y cada minuto visible; los temporizadores solo refrescan datos del servidor.
- Dashboard con identidad de jardín, resumen diario, progreso, rachas, logros y próximos hábitos. Navegación móvil inferior, menú accesible con Escape, formularios responsive, skeletons, feedback de acciones y CSS compatible con `prefers-reduced-motion`.

## Endpoints nuevos

Todos los endpoints de perfil, logros, recordatorios y subtareas requieren la cookie de sesión. El propietario siempre se obtiene del usuario autenticado, nunca del cuerpo enviado por el cliente.

| Método | Ruta | Función |
|---|---|---|
| GET / PUT | `/api/perfil` | Consultar / editar perfil |
| GET / PUT | `/api/perfil/avatar` | Consultar / actualizar foto privada |
| POST | `/api/perfil/password` | Cambiar contraseña y cerrar sesiones |
| POST | `/api/auth/recuperar` | Solicitar enlace por SMTP |
| POST | `/api/auth/restablecer` | Consumir token y cambiar contraseña |
| GET | `/api/logros` | Calcular y consultar medallas |
| POST | `/api/logros/vistos` | Confirmar visualización |
| GET | `/api/notificaciones` | Generar y consultar recordatorios vencidos |
| PATCH | `/api/notificaciones/:id` | Marcar uno como leído |
| PATCH | `/api/notificaciones/leidas` | Marcar todos como leídos |
| POST | `/api/habitos/:id/subtareas` | Crear subtarea |
| PUT / DELETE | `/api/habitos/:id/subtareas/:taskId` | Renombrar / finalizar vigencia |
| PUT | `/api/habitos/:id/subtareas/:taskId/registros/:fecha` | Completar / desmarcar por fecha |
| GET / PUT | `/api/habitos/:id/recordatorio` | Consultar / configurar horario |

Se ampliaron `/api/habitos/estadisticas` (`periodo=semana|mes|ano|rango`, `fecha`, `desde`, `hasta`), `/api/habitos/resumen`, la creación/edición de hábitos y sus registros. Las rutas anteriores siguen disponibles.

## Base de datos y migraciones

Migración [003_habitly.sql](Backend_Habit_Tracker/database/migrations/003_habitly.sql), exclusivamente aditiva, idempotente y con claves foráneas e índices. No se alteraron columnas originales y no contiene DROP.

| Tabla nueva | Columnas principales y restricciones |
|---|---|
| `usuario_perfiles` | `usuario_id` PK/FK, `zona_horaria`, `bio`, `avatar`, `sesion_version` |
| `password_recuperaciones` | `token_hash` PK, `usuario_id` FK, `expira_en`, `usado_en`; índice usuario/expiración |
| `habito_reglas` | `version_id` PK/FK, `intervalo_dias` con CHECK 1–365 |
| `habito_subtareas` | `id`, `habito_id` FK, `nombre`, `desde`, `hasta`; índice hábito/vigencia |
| `subtarea_registros` | `subtarea_id` FK, `fecha`, `completado`; PK subtarea/fecha |
| `usuario_logros` | `usuario_id` FK, `codigo`, `desbloqueado_en`, `visto`; PK usuario/código |
| `habito_recordatorios` | `habito_id` PK/FK, `hora`, `activo`, `desde` |
| `usuario_notificaciones` | `id`, `usuario_id` FK, `habito_id` FK, `fecha`, `hora`, `leido`, `creado_en`; UNIQUE hábito/fecha/hora e índice usuario/leído/fecha |

Las migraciones 001–003 se ejecutaron repetidamente en bases nuevas de prueba. Se verificó que usuarios, hábitos, versiones y registros anteriores permanecen idénticos al aplicar la migración dos veces.

**El esquema y las migraciones ya se ejecutaron en la base configurada**, a pedido del usuario. `database/schema.sql` y `npm run db:migrate` finalizaron correctamente; se verificaron las 13 tablas y la presencia de 2 usuarios, 1 hábito y 1 registro. No se ejecutaron operaciones de borrado ni se modificaron credenciales o `.env`.

Durante la actualización inicial, la conexión había respondido ECONNREFUSED y Windows había negado el permiso para iniciar `MySQL84`. Por eso las pruebas se hicieron en una instancia separada MySQL 8.4.8, limitada a 127.0.0.1:3308 y alojada en `Backend_Habit_Tracker/test-artifacts/mysql-isolated`. Sus datos se conservaron y sus procesos se detuvieron. En la ejecución posterior solicitada por el usuario, la conexión configurada ya estaba disponible, aunque no fue posible iniciar ese servicio Windows desde esta sesión.

## Archivos creados

- Raíz: `AUDITORIA.md`, `HABITLY_ACTUALIZACION.md`.
- Backend: `database/migrations/003_habitly.sql`; `src/controllers/experienceController.js`; `src/routes/experienceRoutes.js`; `src/services/{profileService,recoveryService,subtaskService,achievementService,reminderService}.js`; `src/utils/{profileValidation,achievementRules,statisticsRules}.js`.
- Tests: `tests/{experience,experienceRules,migrations}.test.js`, `tests/helpers/experienceBrowserFlow.js`.
- Frontend: `src/services/experienceApi.js`, `src/hooks/useNotifications.js`, `src/utils/passwordValidation.js`, `src/css/experience.css`; `src/componentes/dashboard/MedalGallery.jsx`; `src/componentes/habits/{SubtaskManager,ReminderForm}.jsx`; `src/componentes/profile/{AvatarPicker,PasswordForm}.jsx`; `src/pages/{Logros,Recordatorios,Recuperar}.jsx`.
- Evidencia local: capturas y logs bajo `Backend_Habit_Tracker/test-artifacts/habitly`, además de bases de prueba aisladas excluidas por el `.gitignore` existente.

## Archivos modificados

- Backend: `package.json`, `package-lock.json`, `.env.example`, `README.md`, `server.js`, `src/app.js`; controladores de autenticación/hábitos; middleware de autenticación; rutas de autenticación/hábitos; repositorio de hábitos; servicios de autenticación/hábitos; utilidades de calendario/validación de hábitos; tests de autenticación/hábitos/navegador y helper de navegador anterior.
- Frontend: `README.md`, `src/App.jsx`, `src/context/AuthProvider.jsx`, `src/hooks/useDashboardHabits.js`, servicios de autenticación/hábitos, utilidad de calendario; componentes `DashboardIcon`, `DashboardLayout`, `Sidebar`, `HabitCard`, `HabitForm`, `ResourceState`, `TrendChart`; páginas `Dashboard`, `Estadisticas`, `MiCuenta`, `HabitDetail`, `Historial`, `iniciar-sesion`.
- Se normalizó el formato de los archivos modificados con Prettier; el contenido funcional de la página Home se conserva. No se cambió el framework CSS ni se incorporó una librería de animación/gráficos.

## Dependencias instaladas

- Backend en producción: `nodemailer` 10.0.16 y `sharp` 0.35.5.
- Backend de desarrollo: `playwright` 1.64.0 y `prettier` 3.9.9. Playwright usó el Edge ya instalado; no se descargó un navegador adicional.
- Sin dependencias nuevas de frontend. `npm install` informó cero vulnerabilidades al instalar estas dependencias.

## Problemas solucionados

- Estadísticas truncadas a 60 períodos: ahora los cálculos usan el historial completo y el recorte se reserva para la presentación.
- Porcentajes del período sesgados por excluir el día actual pendiente: se incluyen obligaciones actuales y se excluyen futuras. El cumplimiento por hábito respeta el filtro elegido.
- Zona horaria fija y actualización del encabezado ligada al día del equipo: ahora dependen del perfil.
- Sesiones anteriores válidas después de un cambio de contraseña: se rechazan mediante versión persistente.
- Una semana parcial inicial podía entrar en las medallas de racha diaria: cada período identifica su tipo, sin convertir semanas en días.
- El router nuevo interceptaba rutas inexistentes con un 401: ahora conserva la respuesta 404 anterior.
- Checkbox de subtarea que esperaba la respuesta para reflejarse: feedback optimista inmediato con reversión en caso de error.
- Desbordamiento del encabezado a 768 px y tamaños intrínsecos de formularios: flex-wrap, tamaños mínimos y columnas ajustables, verificados en navegador.
- Error del patrón glob de tests en Windows/Node 20: descubrimiento estándar de `node --test`.

## Pruebas y resultados

- `npm test`: **63 pruebas, 63 aprobadas, 0 fallidas** con MySQL 8.4.8 real en instancia aislada. Cubren autenticación anterior, errores, CSRF/origen, aislamiento, registros únicos bajo concurrencia, frecuencias, calendario, estadísticas anuales, zonas horarias, medallas, subtareas, avatares, recordatorios, contraseña, expiración/consumo concurrente de tokens y conservación de datos en migraciones repetidas.
- `npm run test:browser`: flujos completos con React + Express + MySQL, usando Playwright/Edge. Creación, edición, archivo/restauración, historia y correcciones; frecuencias nuevas, subtareas, medallas, foto/perfil, contraseña, recordatorios y gráfico anual; acceso anónimo, cierre y expiración de sesión; cinco tamaños (1440, 1024, 768, 390 y 320 px), menú móvil/Escape, teclado y movimiento reducido. Sin errores `pageerror` de React.
- Frontend: `npm run lint` sin advertencias y `npm run build` exitoso. Bundle principal aproximado: 330 KB JS / 100 KB gzip y 47 KB CSS / 9.6 KB gzip.
- El backend inició desde `server.js` contra la instancia de prueba y se reinició durante la prueba de revocación persistente.
- Se revisaron visualmente las capturas del dashboard de escritorio, perfil móvil y colección de medallas.
- No se comprobó el envío a un buzón externo: faltan credenciales SMTP. El formulario y el consumo del token se verifican con tokens reales de prueba, sin simular un correo enviado.

Logs: [API](Backend_Habit_Tracker/test-artifacts/habitly/api-tests.log), [navegador](Backend_Habit_Tracker/test-artifacts/habitly/browser-tests.log). Capturas: [dashboard](Backend_Habit_Tracker/test-artifacts/habitly/habits-dashboard-desktop.png), [perfil móvil](Backend_Habit_Tracker/test-artifacts/habitly/profile-mobile.png), [medallas](Backend_Habit_Tracker/test-artifacts/habitly/medals-desktop.png).

## Configuraciones pendientes

1. Esquema y migraciones: ejecutados y verificados en la base configurada; ya no están pendientes.
2. Para correo: configurar `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM` y, si corresponde, `SMTP_USER`/`SMTP_PASSWORD` en el entorno. El puerto 587 usa STARTTLS obligatorio; 465 usa TLS directo con `SMTP_SECURE=true`. Usar un servidor propio o disponible, sin agregar servicios pagos. `.env.example` documenta las opciones y el `.env` real se conserva intacto.
3. Verificar entrega real con ese servidor SMTP. Sin host/remitente, el endpoint responde 503 para todas las direcciones y el frontend muestra que el correo todavía no está configurado. La entrega se ejecuta fuera de la respuesta HTTP para reducir diferencias de tiempo entre direcciones; los errores se registran sin secretos y los tokens de entregas fallidas se invalidan.

## Mejoras futuras

Compresión del logo PNG original de 895 KB; paginación de todo el historial para cuentas muy antiguas; una cola duradera de correo con reintentos si aumenta el volumen; un almacén compartido de límites de intentos si se despliega en varios procesos; pruebas adicionales de lectores de pantalla y navegadores Safari/Firefox. No son requisitos para usar los flujos implementados.

Referencias utilizadas: [recuperación segura de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html), [SMTP y TLS de Nodemailer](https://nodemailer.com/smtp), [decodificación y límites de Sharp](https://sharp.pixelplumbing.com/api-constructor/).
