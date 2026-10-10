# Sistema visual y accesibilidad

La identidad Habitly / Orbit usa fondo tinta, acentos menta, azul y lavanda,
superficies con profundidad y una marca orbital SVG. Las fuentes variables
Manrope y Space Grotesk se sirven desde la aplicación con `font-display: swap`.
Las dependencias y versiones se mantienen en el `package-lock.json` del frontend.

## Organización del frontend

Todas las rutas de código siguientes son relativas a
`Frontend_Habit_Tracker/frontend habit tracker/src/`.

| Ubicación | Función |
| --- | --- |
| `css/variables.css`, `css/base.css` | Tokens y reglas globales |
| `css/home*.css`, `css/auth.css` | Portada y formularios de acceso |
| `css/dashboard*.css` | Navegación, encabezado y paneles |
| `css/habit*.css` | Tarjetas, formularios, calendario y gráficos |
| `css/experience.css`, `css/profile.css`, `css/gamification.css` | Experiencia, perfil y medallas |
| `css/motion.css`, `css/visuals.css`, `css/orbit.css` | Movimiento y elementos visuales |
| `componentes/visual/` | `BrandMark`, `OrbitVisual`, `AnimatedNumber`, `CelebrationProvider` |
| `hooks/useAnimatedValue.js`, `hooks/useCelebration.js` | Contadores y celebración |

Los archivos de entrada `dashboard.css`, `habits.css` y `experience.css` agrupan
importaciones. Mantener los tokens y componentes compartidos al agregar pantallas.

## Rutas y navegación

Las rutas públicas son `/`, `/Registro`, `/IniciarSesion` y `/recuperar`.
Dentro de `/dashboard` se encuentran el resumen, `habitos`, creación/detalle/edición,
`historial`, `estadisticas`, `logros`, `recordatorios` y `configuracion`.
`/MiCuenta` mantiene una redirección protegida al perfil.

El dashboard muestra intención diaria, anillo de progreso, métricas, hábitos,
medallas y recordatorios. Las tarjetas distinguen cantidad, finalización y racha.
En móvil, la navegación inferior conserva cuatro accesos y el menú abre el resto.
Los estados vacíos, de carga y de error deben reflejar datos reales de la API.

## Movimiento y accesibilidad

Los contadores y el anillo convergen al valor real durante 650 ms.
La celebración aparece después de una respuesta exitosa que confirma la
finalización de hoy; no por progreso parcial, error, recarga o guardado repetido.
Las subtareas comparten esa confirmación. Una corrección histórica no debe
presentarse como una finalización de hoy.

Las celebraciones usan 18 partículas durante un segundo y un mensaje de 3,2
segundos. Los temporizadores y `requestAnimationFrame` se limpian al desmontar.
Con `prefers-reduced-motion`, los valores se actualizan directamente, se reducen
transiciones y se ocultan partículas.

Se conservan foco visible, enlace para saltar al contenido, cierre de menú con
Escape y alternativas tabulares para gráficos. Los gráficos permiten teclado y
selección de fechas; el calendario mantiene etiquetas de estado.
Para verificar tamaños y animaciones, consultar [pruebas](pruebas.md).
