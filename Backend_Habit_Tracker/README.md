# Habitly · backend

API Express/MySQL para autenticación, hábitos, historial, estadísticas, perfil,
subtareas, medallas y recordatorios. Usa ES Modules y Node.js 20.19 o superior
compatible con las dependencias.

## Preparación y arranque

Desde este directorio:

```powershell
npm ci
Copy-Item .env.example .env
```

Conservá un `.env` existente. Configurá la conexión SQL y generá un `JWT_SECRET`
propio como indica el [inicio local](../README.md#ejecutar-localmente).
En una base nueva, ejecutá [database/schema.sql](database/schema.sql) desde un
cliente SQL; después, con el entorno configurado:

```powershell
npm run db:migrate
npm run dev
```

`npm start` inicia sin recarga. El servidor comprueba conexión y tablas antes de
escuchar. Las migraciones actuales son aditivas y se pueden repetir; no crean un
respaldo automático. Para una base existente, verificá un respaldo y la
compatibilidad del esquema antes de aplicarlas.

## Variables de entorno

La plantilla [.env.example](.env.example) contiene todas las opciones.

| Variable | Uso / valor de desarrollo |
| --- | --- |
| `NODE_ENV` | `development`; `production` activa cookies Secure |
| `PORT` | Puerto HTTP, normalmente `3000` |
| `FRONTEND_URL` | Origen exacto permitido: `http://localhost:5173`, sin ruta ni barra final |
| `DB_HOST`, `DB_PORT` | Servidor SQL; plantilla `127.0.0.1:3306`, ajustar a tu instalación |
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Credenciales privadas y base; esquema predeterminado `habit_tracker` |
| `JWT_SECRET` | Secreto privado aleatorio de al menos 32 bytes |
| `JWT_EXPIRES_SECONDS` | Duración de sesión: 86400 por defecto, entre 1 y 604800 segundos |
| `COOKIE_SAME_SITE` | `lax`, `strict` o `none`; `none` exige producción con HTTPS |
| `SMTP_HOST`, `SMTP_FROM` | Servidor/remitente de recuperación; sin ambos, el endpoint responde 503 |
| `SMTP_PORT`, `SMTP_SECURE` | 587 con STARTTLS y `false`, o 465 con TLS directo y `true` |
| `SMTP_USER`, `SMTP_PASSWORD` | Autenticación SMTP cuando el servidor la requiere |

Los valores reales se guardan en `.env` o en el entorno del servicio. Nunca
copiarlos al frontend ni publicarlos. La cuenta que aplica migraciones necesita
crear tablas; la cuenta de ejecución puede tener permisos limitados a lectura y
escritura de datos.

## Verificación y mantenimiento

```powershell
npm test
npm run test:browser
```

Las pruebas de integración crean bases aisladas y las conservan. Necesitan SQL
real y permisos adecuados; las de navegador también necesitan Chromium o Edge.
Consultar [pruebas](../docs/pruebas.md) para configurar `TEST_DB_*`, ejecutable,
puertos y artefactos.

Si el arranque informa una tabla ausente, revisar esquema y migraciones. Si la
conexión es rechazada, comprobar servicio SQL, puerto y credenciales. Si el puerto
HTTP está ocupado, comprobar si ya existe una instancia de la API.

- [Arquitectura y migraciones](../docs/arquitectura.md)
- [Endpoints y contratos](../docs/api.md)
- [Reglas de hábitos](../docs/habitos.md)
- [Autenticación y despliegue](../docs/seguridad.md)
