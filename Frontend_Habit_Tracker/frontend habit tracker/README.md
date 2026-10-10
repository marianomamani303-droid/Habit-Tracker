# Habitly · frontend

Dashboard desarrollado con React, Vite y React Router. Consulta
[DASHBOARD.md](../../DASHBOARD.md) para la arquitectura, las rutas protegidas,
el inventario de archivos y las rutas protegidas.

La interfaz usa la identidad oscura Habitly / Orbit. Consultá
[REDISENO_VISUAL.md](../../REDISENO_VISUAL.md) para componentes, animaciones,
dependencias, capturas y pruebas del rediseño. Las fuentes variables Manrope y
Space Grotesk se sirven localmente.

Antes de iniciar la API, configura MySQL y ejecuta `npm run db:migrate` en
`Backend_Habit_Tracker`. El frontend usa la configuración existente `VITE_API_URL`
y cookies HttpOnly; no almacena tokens en el navegador.

```powershell
npm run dev -- --port 5173 --strictPort
npm run lint
npm run build
```

Tras iniciar sesión se abre `/dashboard`. `/MiCuenta` mantiene el acceso al perfil
en `/dashboard/configuracion`. El perfil permite editar datos, foto, zona horaria y
contraseña. `/dashboard/logros` muestra medallas y `/dashboard/recordatorios` permite
consultar los avisos internos. `/recuperar` solicita o consume enlaces temporales.

Estadísticas semanales, mensuales y anuales usan registros reales de la API. Los hábitos
admiten subtareas, horarios y frecuencias cada N días. Se mantiene CSS modular y se añade
navegación móvil con respeto por `prefers-reduced-motion`.

La API debe aplicar `003_habitly.sql` antes de usar esta versión. El correo de recuperación
requiere SMTP configurado. Ver [informe integral](../../HABITLY_ACTUALIZACION.md).

## Información del template React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
