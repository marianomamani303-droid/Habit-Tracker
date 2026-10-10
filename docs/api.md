# API y contratos HTTP

La URL local de la API es `http://localhost:3000/api`. Las operaciones de escritura
requieren `Content-Type: application/json`, incluso cuando el cuerpo es `{}`.
El frontend usa `credentials: "include"` para la cookie HttpOnly; el JWT no se
devuelve en JSON. Las rutas privadas obtienen el usuario desde la sesión validada.

## Autenticación

| Método | Ruta | Función |
| --- | --- | --- |
| POST | `/api/auth/register` | Crear cuenta con `nombre`, `apellido`, `email`, `password`, `confirmar` |
| POST | `/api/auth/login` | Iniciar sesión con `email`, `password` |
| GET | `/api/auth/me` | Perfil público y `expiresInMs`; requiere sesión |
| POST | `/api/auth/logout` | Revocar la sesión y eliminar su cookie; cuerpo `{}` |
| POST | `/api/auth/recuperar` | Solicitar enlace SMTP con `email` |
| POST | `/api/auth/restablecer` | Consumir `token` con `password`, `confirmar` |

Registro, login y `/me` devuelven un objeto `usuario` con el perfil público.
No contienen el hash de contraseña. El cierre de sesión es idempotente.
Sin `SMTP_HOST` y `SMTP_FROM`, recuperación responde 503. Con correo configurado,
su mensaje no revela si la dirección está registrada.

## Hábitos

Todas estas rutas requieren sesión. Ver [reglas de hábitos](habitos.md) para
vigencias, cantidades, cuotas y archivo lógico.

| Método | Ruta | Operación / datos |
| --- | --- | --- |
| GET | `/api/habitos` | Listar; `estado=todos\|activos\|archivados\|completados` |
| POST | `/api/habitos` | Crear una definición |
| GET | `/api/habitos/:id` | Consultar detalle propio |
| PUT | `/api/habitos/:id` | Editar con una definición completa y el mismo `inicio` |
| PATCH | `/api/habitos/:id/estado` | `{ "archivado": true }` o `false` |
| DELETE | `/api/habitos/:id` | Archivar; cuerpo `{}` |
| PUT | `/api/habitos/:id/registros/:fecha` | `{ "cantidad": 20 }`, cantidad absoluta |
| GET | `/api/habitos/resumen` | Datos del dashboard |
| GET | `/api/habitos/estadisticas` | `periodo=semana\|mes\|ano\|rango`, `fecha`, `desde`, `hasta` |
| GET | `/api/habitos/historial` | `mes=YYYY-MM`, calendario mensual |
| POST | `/api/habitos/:id/subtareas` | Crear con `nombre` |
| PUT | `/api/habitos/:id/subtareas/:taskId` | Renombrar con `nombre` |
| DELETE | `/api/habitos/:id/subtareas/:taskId` | Finalizar vigencia; cuerpo `{}` |
| PUT | `/api/habitos/:id/subtareas/:taskId/registros/:fecha` | `{ "completado": true }` o `false` |
| GET / PUT | `/api/habitos/:id/recordatorio` | Consultar / configurar `hora` y `activo` |

Ejemplo de definición; elegí una fecha de inicio válida para tu zona horaria:

```json
{
  "nombre": "Leer",
  "descripcion": "Lectura diaria",
  "frecuencia": "diario",
  "inicio": "2026-10-10",
  "objetivo": 20,
  "unidad": "páginas",
  "dias": [],
  "dias_semana": 1
}
```

Para `dias`, enviá días ISO sin duplicados. Para `semanal`, configurá
`dias_semana` entre 1 y 7. Para `personalizado`, agregá `intervalo_dias` entre 1 y 365.

## Perfil, medallas y notificaciones

Todas requieren sesión; el avatar es privado y se transmite mediante JSON al subirlo.

| Método | Ruta | Función |
| --- | --- | --- |
| GET / PUT | `/api/perfil` | Consultar / editar `nombre`, `apellido`, `bio`, `zona_horaria` |
| GET / PUT | `/api/perfil/avatar` | Consultar WebP / subir `tipo` MIME e `imagen` en base64 |
| POST | `/api/perfil/password` | Cambiar con `actual`, `password`, `confirmar`; revoca sesiones |
| GET | `/api/logros` | Consultar y calcular medallas |
| POST | `/api/logros/vistos` | Confirmar visualización |
| GET | `/api/notificaciones` | Generar y consultar avisos vencidos |
| PATCH | `/api/notificaciones/:id` | Marcar uno como leído; cuerpo `{}` |
| PATCH | `/api/notificaciones/leidas` | Marcar todos como leídos; cuerpo `{}` |

## Errores

Los errores usan `{ "mensaje": "..." }`. Registro y creación responden 201;
las consultas y actualizaciones exitosas normalmente responden 200.
Errores habituales: 400 validación, 401 sesión inválida, 403 origen no permitido,
404 recurso ausente o ajeno, 409 conflicto/límite, 413 cuerpo demasiado grande,
415 escritura sin JSON, 429 demasiados intentos y 503 recuperación sin SMTP.
Errores internos responden sin SQL, credenciales ni stack traces.

Los contratos completos están en los controladores y validadores de
[src/](../Backend_Habit_Tracker/src/); los servicios del frontend muestran cómo consumirlos.
