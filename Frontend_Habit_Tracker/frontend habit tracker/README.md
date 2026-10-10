# Habitly · frontend

Aplicación React, Vite y React Router, con CSS modular y la identidad visual
Habitly / Orbit. Consume la API con cookies HttpOnly.

## Preparación y arranque

Primero configurar SQL, instalar las dependencias del backend, aplicar sus
migraciones e iniciar la API. Ver el [inicio local](../../README.md#ejecutar-localmente).
Desde este directorio:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev -- --port 5173 --strictPort
```

Conservá un `.env` existente. La plantilla [.env.example](.env.example) define
`VITE_API_URL=http://localhost:3000/api`. Las variables `VITE_*` son públicas;
no deben contener credenciales ni el secreto JWT. Reiniciar Vite al cambiar el
entorno; volver a compilar si cambia la URL para producción.

El servidor de desarrollo abre en <http://localhost:5173>. Tras iniciar sesión,
`/dashboard` reúne hábitos, historial, estadísticas, medallas, recordatorios y
perfil. `/MiCuenta` redirige al perfil; `/recuperar` solicita o consume enlaces
temporales, cuyo envío requiere SMTP en el backend.

## Comandos

```powershell
npm run lint
npm run build
npm run preview
```

`build` genera `dist/`, excluido de Git. `preview` permite revisar esa compilación.
`npm run test:visual` necesita una conexión SQL de pruebas explícita y un navegador;
consultar la [guía de pruebas](../../docs/pruebas.md).

- [Arquitectura](../../docs/arquitectura.md)
- [API](../../docs/api.md)
- [Sistema visual, componentes y accesibilidad](../../docs/diseno.md)
- [Reglas de hábitos y estadísticas](../../docs/habitos.md)
- [Seguridad y configuración del hosting](../../docs/seguridad.md)
