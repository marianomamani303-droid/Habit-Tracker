# Autenticación, seguridad y despliegue

Esta guía describe los controles implementados y las decisiones de operación.
No certifica la seguridad del proyecto ni reemplaza una revisión del despliegue.

## Sesiones y contraseñas

Las contraseñas se guardan con bcrypt, costo 12 y salt aleatorio. Se exige un
mínimo de 8 caracteres y un máximo de 72 bytes UTF-8. La confirmación debe coincidir.
El login usa el mismo error para email desconocido y contraseña incorrecta.

El JWT se firma con HS256 y contiene el ID de usuario, la versión de sesión `sv`
y los claims de emisor, audiencia, emisión, expiración e identificador `jti`.
No contiene la contraseña ni su hash. La firma protege integridad; el payload
no está cifrado.

La cookie `habitly_session` tiene `HttpOnly`, `Path=/api`, `SameSite=lax` por
defecto y `Secure` en producción. Cookie y JWT comparten duración. React usa
cookies con `credentials: "include"` y no guarda tokens en localStorage o sessionStorage.

En cada acceso privado, el backend verifica firma, algoritmo, emisor, audiencia,
expiración, revocación persistente, existencia del usuario y versión de sesión.
Logout persiste el digest SHA-256 y vencimiento del token antes de eliminar la
cookie. Cambiar o restablecer contraseña incrementa la versión persistente y
revoca todas las sesiones anteriores.

`AuthProvider` comprueba sesión al iniciar, navegar, recuperar foco y cada minuto
visible. También programa su expiración. Descarta respuestas obsoletas para no
restaurar una sesión cerrada. `ProtectedRoute` oculta las páginas privadas durante
la comprobación y los errores; la autorización efectiva se realiza en el backend.

## Autorización y entradas

- El propietario proviene de `req.usuario.id`; enviar otro ID no concede acceso.
- Consultas parametrizadas y bloqueos por hábito/propietario protegen escrituras.
  Un hábito ajeno devuelve el mismo 404 que uno inexistente.
- CORS acepta el origen exacto `FRONTEND_URL` y habilita credenciales. Se admiten
  herramientas sin `Origin`; CORS no sustituye la autenticación.
- Las escrituras requieren JSON, combinado con validación de origen y SameSite.
- Registro, login y recuperación comparten 20 solicitudes por IP cada 15 minutos.
  Cambio de contraseña y carga de avatar comparten otro límite de 10.
- JSON general limitado a 10 KB; el endpoint de avatar admite hasta 3 MB de JSON.
- Respuestas de autenticación y datos privados usan `Cache-Control: no-store`;
  los errores públicos omiten SQL, secretos y stack traces.

## Recuperación y avatar

Los tokens de recuperación usan 32 bytes aleatorios; la base guarda su digest
SHA-256, vencimiento de 30 minutos y estado de consumo. El consumo es atómico y
de un solo uso. El enlace transporta el token en un fragmento y el frontend lo
retira de la URL al abrir el formulario. La respuesta no revela si el email existe.
La entrega SMTP ocurre fuera de la respuesta HTTP; los fallos invalidan los
tokens afectados y se registran sin sus valores.

El avatar acepta JPEG, PNG o WebP de hasta 2 MB y 16 millones de píxeles.
Se decodifica y recodifica como WebP 256×256, eliminando metadatos. Se guarda en
MySQL y solo puede consultarlo el usuario autenticado correspondiente.

## Configuración y publicación

Los valores reales permanecen en `.env` o en el entorno del servicio.
Las plantillas `.env.example` no deben contener credenciales. Todas las variables
`VITE_*` se incorporan al navegador y son públicas. No publicar dumps, enlaces de
recuperación, cookies, logs con datos personales ni capturas de cuentas reales.

En producción, configurar `NODE_ENV=production`, un `JWT_SECRET` propio,
`FRONTEND_URL` HTTPS y `VITE_API_URL` HTTPS. Usar una cuenta SQL con permisos
limitados, separando los permisos de migración de los de ejecución.

Frontend y API pueden compartir dominio con `/api` detrás de un proxy o usar
subdominios del mismo sitio con `SameSite=lax`. Sitios distintos requieren
`COOKIE_SAME_SITE=none`, HTTPS y cookies Secure; las restricciones del navegador
para cookies de terceros pueden impedir esa configuración.

Al agregar un proxy, configurar `trust proxy` según sus saltos/IPs antes de
depender del límite por cliente. El proyecto no lo configura actualmente.
El limitador está en memoria: para varios procesos se necesita un almacén compartido.
El correo no tiene una cola duradera ni reintentos persistentes.

El hosting del frontend debe resolver rutas de React a `index.html` y enviar
`/api` a Express cuando se usa un dominio común. `npm run preview` sirve para
revisar una compilación local. Mantener respaldos verificados y evaluar el
despliegue concreto antes de publicar datos reales.
