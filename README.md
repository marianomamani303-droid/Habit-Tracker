# Habit Tracker · Habitly

Aplicación web para organizar hábitos, registrar avances y consultar el historial.
La interfaz Habitly usa React y Vite; la API usa Express y MySQL.

## Funcionalidades

- Registro, inicio y cierre de sesión, perfil editable y recuperación de contraseña por correo.
- Hábitos diarios, por días de la semana, con cuota semanal o cada N días.
- Objetivos cuantitativos, subtareas y archivo/restauración sin perder el historial.
- Dashboard, calendario con correcciones históricas y estadísticas semanales, mensuales y anuales.
- Rachas, medallas persistentes y recordatorios internos según la zona horaria del perfil.
- Interfaz responsive, navegación por teclado y soporte para movimiento reducido.

## Requisitos

- Node.js 20.19 o superior compatible con las dependencias y npm.
- Un servidor MySQL. Las pruebas de integración del proyecto se desarrollaron con MySQL 8.4;
  también se usó MariaDB 10.4 en etapas anteriores, sin verificar aquí compatibilidad completa.
- SMTP si querés habilitar el envío de enlaces de recuperación. El resto de la app puede funcionar sin SMTP.

## Ejecutar localmente

Los comandos siguientes usan PowerShell y parten de la raíz del repositorio.
En Windows podés usar `npm.cmd` si la política de PowerShell bloquea `npm.ps1`.

### 1. Instalar y configurar el backend

```powershell
cd Backend_Habit_Tracker
npm ci
Copy-Item .env.example .env
```

Si ya tenés un `.env`, conservá sus valores. Configurá `DB_HOST`, `DB_PORT`,
`DB_USER`, `DB_PASSWORD` y `DB_NAME` con tu instalación. Generá un secreto propio:

```powershell
node --input-type=module -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(48).toString('hex'));"
```

Guardá el resultado en `JWT_SECRET` dentro del `.env` del backend. No lo publiques.
El origen de desarrollo previsto es `FRONTEND_URL=http://localhost:5173`.

### 2. Preparar la base de datos e iniciar la API

En una instalación nueva, ejecutá
[database/schema.sql](Backend_Habit_Tracker/database/schema.sql) desde un cliente SQL,
con una cuenta que pueda crear la base y las tablas. El archivo crea `habit_tracker`
y la tabla `usuarios`; si elegís otro nombre, ajustá también el SQL y `DB_NAME`.

Con el backend configurado, en la misma terminal:

```powershell
npm run db:migrate
npm run dev
```

El migrador aplica los archivos 001–003 y puede repetirse. En una instalación con
datos, verificá un respaldo antes de migrar. La API comprueba las tablas al arrancar;
no aplica migraciones automáticamente. Más detalles en [arquitectura](docs/arquitectura.md).

### 3. Iniciar el frontend

En otra terminal desde la raíz del repositorio:

```powershell
cd "Frontend_Habit_Tracker/frontend habit tracker"
npm ci
Copy-Item .env.example .env
npm run dev -- --port 5173 --strictPort
```

Conservá un `.env` existente. El valor de desarrollo es
`VITE_API_URL=http://localhost:3000/api`. Abrí <http://localhost:5173> y creá una cuenta.
Usá `localhost` de forma consistente en las URLs del frontend y la API para las cookies.
No hay cuentas de demostración preconfiguradas.

## Comandos

| Directorio | Comando | Propósito |
| --- | --- | --- |
| `Backend_Habit_Tracker` | `npm run dev` / `npm start` | API con recarga / arranque normal |
| `Backend_Habit_Tracker` | `npm run db:migrate` | Aplicar migraciones |
| `Backend_Habit_Tracker` | `npm test` | Pruebas de reglas e integración SQL |
| `Backend_Habit_Tracker` | `npm run test:browser` | Flujos completos con navegador |
| `Frontend_Habit_Tracker/frontend habit tracker` | `npm run lint` | Análisis del frontend |
| `Frontend_Habit_Tracker/frontend habit tracker` | `npm run build` / `npm run preview` | Compilar / previsualizar la compilación |
| `Frontend_Habit_Tracker/frontend habit tracker` | `npm run test:visual` | Verificación visual y de animaciones |

Las pruebas de integración necesitan una conexión SQL y permiso para crear bases
aisladas; las de navegador requieren Chromium o Edge. Consultá [pruebas](docs/pruebas.md)
antes de ejecutarlas.

## Organización y documentación

```text
Backend_Habit_Tracker/                       API, SQL, migraciones y pruebas
Frontend_Habit_Tracker/frontend habit tracker/  Aplicación React
docs/                                       Documentación técnica
```

- [Arquitectura y base de datos](docs/arquitectura.md)
- [API y contratos HTTP](docs/api.md)
- [Reglas de hábitos, calendario y estadísticas](docs/habitos.md)
- [Autenticación, seguridad y despliegue](docs/seguridad.md)
- [Pruebas y verificaciones](docs/pruebas.md)
- [Sistema visual y accesibilidad](docs/diseno.md)
- [Backend](Backend_Habit_Tracker/README.md) y [frontend](Frontend_Habit_Tracker/frontend%20habit%20tracker/README.md)

Los `.env`, dependencias, compilaciones, logs y artefactos de pruebas quedan fuera
de Git. Las plantillas `.env.example` se conservan sin secretos. Las variables
`VITE_*` son públicas: nunca deben contener credenciales ni el secreto JWT.
