# Pruebas y verificaciones

Cada proyecto conserva sus scripts en `package.json`. Instalar dependencias con
`npm ci` en ambos directorios. En Windows se puede usar `npm.cmd`.

## Verificaciones sin base de datos

Desde `Frontend_Habit_Tracker/frontend habit tracker`:

```powershell
npm run lint
npm run build
```

Desde `Backend_Habit_Tracker`, para reglas puras de calendario y experiencia:

```powershell
node --test tests/habitCalendar.test.js tests/experienceRules.test.js
```

## Integración SQL

`npm test`, ejecutado en el backend, incluye integración HTTP/SQL, autenticación,
aislamiento entre usuarios, frecuencias, historial, subtareas, medallas, perfil,
avatares, recordatorios, recuperación y migraciones idempotentes.
Necesita un servidor SQL real y una cuenta de pruebas con permiso `CREATE DATABASE`.

Configurar en la terminal `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER` y
`TEST_DB_PASSWORD` con la conexión de una instancia de pruebas. Si no se definen,
las pruebas del backend recurren a `DB_*` del `.env`. Para usar una conexión
separada sin escribir la contraseña en la documentación o en un comando literal:

```powershell
$env:TEST_DB_HOST = '127.0.0.1'
$env:TEST_DB_PORT = '3306' # Ajustar al puerto de la instancia de pruebas.
$testCredentials = Get-Credential -Message 'Cuenta SQL de pruebas'
$env:TEST_DB_USER = $testCredentials.UserName
$env:TEST_DB_PASSWORD = $testCredentials.GetNetworkCredential().Password
npm test
```

Los scripts crean bases nuevas con prefijos `habit_tracker_test_`,
`habit_system_test_`, `habitly_experience_test_` y `habitly_migration_test_`.
Las conservan al terminar; no ejecutan `DROP DATABASE`. Los borrados de filas
de prueba se limitan a esas bases. La repetición puede acumular bases y requerir
limpieza manual después de revisar su contenido.

## Flujos de navegador

Playwright está declarado como dependencia de desarrollo del backend. Instalar
también el frontend y disponer de Chromium o Edge. Desde el backend, con la
conexión `TEST_DB_*` configurada:

```powershell
# Usar esta ruta si Edge está instalado allí; ajustar para otro ejecutable.
$env:TEST_BROWSER_EXECUTABLE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
npm run test:browser
```

Si no se especifica ejecutable, se usa el Chromium instalado para Playwright;
`npx playwright install chromium` permite prepararlo desde el backend.

El script crea una base `habit_tracker_test_browser_*`, inicia API/Vite en
3002/5175 y cierra sus procesos al terminar. `TEST_BACKEND_PORT` y
`TEST_FRONTEND_PORT` permiten otros puertos; `TEST_ARTIFACT_DIR` habilita capturas.
Incluye registro/login, navegación protegida, recarga, CRUD, frecuencias,
historial, perfil, subtareas, recuperación, recordatorios y revocación/expiración.

## Verificación visual

Desde el frontend, con las dependencias del backend instaladas:

```powershell
npm run test:visual
```

Este script exige `TEST_DB_HOST`, `TEST_DB_PORT` y `TEST_DB_USER` explícitos;
`TEST_DB_PASSWORD` se usa si está definido. No recurre al `.env` de la aplicación.
Crea una base `habit_visual_test_*`, usa puertos fijos 3003/5176 y conserva la base.
Las capturas se generan en `test-artifacts/orbit/`, excluido de Git.
También admite `TEST_BROWSER_EXECUTABLE`.

Comprueba desbordamiento en 1440, 1024, 768, 390 y 320 px, convergencia de
contadores, progreso confirmado por API, celebraciones y movimiento reducido.
No equivale a pruebas de dispositivos físicos, lectores de pantalla, todos los
navegadores ni a una medición Lighthouse/FPS.

Al terminar, quitá las credenciales temporales de la terminal cuando ya no las necesites:

```powershell
Remove-Item Env:TEST_DB_PASSWORD -ErrorAction SilentlyContinue
Remove-Variable testCredentials -ErrorAction SilentlyContinue
```

Para comprobar SMTP, hace falta además una entrega real a un buzón con el
servidor configurado. Las pruebas de consumo de tokens no certifican esa entrega.
Los resultados de una ejecución deben obtenerse de sus logs actuales, sin tomar
los conteos de informes anteriores como garantía del estado presente.
