# Habitly / Orbit — rediseño visual

Implementado el 9 de octubre de 2026 sobre el frontend React existente.

## Identidad y experiencia

El nuevo sistema usa un fondo tinta, acentos menta, azul y lavanda, superficies con profundidad y una marca orbital SVG. La portada se reconstruyó con una ilustración abstracta, secciones de producto y llamadas a la acción conectadas al registro o al Dashboard según la sesión. Se retiró la demostración de hábitos y porcentajes de la portada.

El Dashboard reúne la intención del día y el anillo de progreso en una cabecera, seguida de estadísticas, hábitos, medallas y próximos recordatorios. Los mensajes del anillo cambian según el cumplimiento real. Las tarjetas distinguen finalización, cantidad y racha; la colección organiza los hábitos en dos columnas cuando hay espacio.

Login, registro y recuperación comparten formularios oscuros con foco luminoso. Los formularios de hábitos incorporan una guía de intención, frecuencia y objetivo. Historial, gráficos, medallas, perfil y recordatorios usan el mismo sistema. Los títulos de creación, detalle y edición identifican la página actual.

En móvil, la navegación inferior conserva cuatro accesos y el menú permite acceder a todas las secciones. El calendario conserva los estados y sus etiquetas; los gráficos mensuales permiten desplazamiento horizontal con barras suficientemente anchas para seleccionar fechas.

## Movimiento y datos

- Entradas de páginas y tarjetas, hover, foco y botones comunican interacción.
- Contadores y anillo interpolan hasta el valor real durante 650 ms; las barras animan su entrada y actualización.
- La celebración aparece después de una respuesta exitosa que confirma la finalización de hoy. No se dispara con progreso parcial, errores, una recarga ni el guardado repetido de un hábito completado.
- Subtareas y acciones de completar todos los pasos usan esa misma confirmación.
- Cuando crece una racha de tres o más períodos, se muestra el valor confirmado y su unidad. La racha permanece visible en la tarjeta.
- Las celebraciones usan 18 partículas durante un segundo y un mensaje que desaparece a los 3,2 segundos. El proveedor persiste durante la recarga de los datos y limpia su temporizador al desmontarse.
- Las correcciones de fechas anteriores conservan el flujo de historial y las métricas; no se deduce una celebración histórica a partir de la respuesta de hoy.
- Con `prefers-reduced-motion`, los contadores actualizan directamente, las transiciones se reducen y las partículas se ocultan.

Los endpoints, servicios de API, autenticación, frecuencias y cálculos del backend se conservan. Este rediseño no modificó la base de datos de la aplicación.

## Organización y dependencias

Tokens globales en `src/css/variables.css`. Estilos separados para portada, navegación, cabecera, paneles, tarjetas, formularios, calendario/gráficos, perfil, medallas y movimiento. Los archivos de entrada `dashboard.css`, `habits.css` y `experience.css` conservan las importaciones existentes. El archivo CSS más extenso tiene 311 líneas.

Componentes reutilizables: `BrandMark`, `OrbitVisual`, `AnimatedNumber` y `CelebrationProvider`; hooks `useAnimatedValue` y `useCelebration`.

Dependencias agregadas:

| Paquete | Versión instalada | Uso |
| --- | --- | --- |
| `@fontsource-variable/manrope` | 5.3.0 | Texto y formularios |
| `@fontsource-variable/space-grotesk` | 5.3.0 | Titulares y números |

Las fuentes se sirven desde la aplicación con `font-display: swap`. La marca SVG reemplaza la importación de la imagen PNG grande. El movimiento usa CSS y `requestAnimationFrame`, con limpieza y duración acotada.

Compilación final: JavaScript 335,32 kB / 102,31 kB gzip; CSS 58,54 kB / 14,74 kB gzip. Las fuentes latinas suman aproximadamente 47 kB; los otros subconjuntos se cargan según los caracteres utilizados. Estos tamaños no equivalen a una medición de FPS.

## Verificación

| Verificación | Resultado |
| --- | --- |
| `npm run lint` del frontend | Sin errores |
| `npm run build` del frontend | Compilación correcta |
| `npm test` del backend | 63 pruebas aprobadas; ninguna fallida |
| `npm run test:browser` del backend | Flujos completos aprobados en Edge/Chromium |
| `npm run test:visual` del frontend | Responsive, confirmación de logros, rachas, subtareas y movimiento reducido aprobados |

Las pruebas utilizaron MySQL aislado en el puerto 3308 y bases nuevas de prueba. No reutilizaron los datos de la aplicación. Se conservaron esas bases para inspección.

Los flujos de navegador incluyen registro, login, navegación privada, recarga, creación/edición/archivo/restauración de hábitos, frecuencias, correcciones históricas, estadísticas, subtareas, perfil, foto, contraseña, recuperación con token real, recordatorios, logout, revocación y expiración de sesión.

Se comprobó ausencia de desbordamiento a 1440, 1024, 768, 390 y 320 px. La prueba visual además verifica que los contadores convergen, el progreso coincide con la API, las animaciones CSS terminan y las partículas desaparecen con movimiento reducido. No se detectaron errores de React.

Se inspeccionaron capturas de escritorio y móvil. Capturas estables del rediseño: `Frontend_Habit_Tracker/frontend habit tracker/test-artifacts/orbit/`. Capturas de los flujos existentes: `Backend_Habit_Tracker/test-artifacts/futuristic/`.

## Repetir pruebas y límites

Desde el frontend, con MySQL aislado ya iniciado y las dependencias de ambos proyectos instaladas:

```powershell
$env:TEST_DB_HOST='127.0.0.1'
$env:TEST_DB_PORT='3308'
$env:TEST_DB_USER='root'
$env:TEST_DB_PASSWORD=''
$env:TEST_BROWSER_EXECUTABLE='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
npm run test:visual
```

El script requiere una conexión de prueba explícita; crea una base con prefijo `habit_visual_test_`, inicia servidores temporales en 3003/5176 y los cierra al finalizar.

Quedan fuera de esta verificación dispositivos físicos, Safari/Firefox, lectores de pantalla y una auditoría Lighthouse/FPS en equipos de recursos limitados. La entrega SMTP depende de la configuración existente; se verificaron el formulario, el consumo de un token real y el estado de servicio sin configurar.

