# Reglas de hábitos, calendario y estadísticas

Estas reglas corresponden a `habitCalendar.js`, `habitService.js`,
`subtaskService.js` y `statisticsRules.js` del backend. Los endpoints se documentan
en [API](api.md).

## Fechas y frecuencias

La fecha de seguimiento se obtiene según la zona horaria IANA del perfil; el valor
predeterminado es `America/Argentina/Buenos_Aires`. La API devuelve `fecha` y
`zonaHoraria`. Los registros y vigencias usan fechas `YYYY-MM-DD`, no instantes;
la aritmética interna de fechas evita conversiones por la zona del equipo.

| Frecuencia de la API | Obligación |
| --- | --- |
| `diario` | Un período por día activo desde el inicio |
| `dias` | Solo los días ISO seleccionados: lunes=1, domingo=7 |
| `semanal` | Cuota de 1–7 días distintos dentro de una semana de lunes a domingo |
| `personalizado` | Cada `intervalo_dias` días (1–365), anclados al inicio |

Los intervalos personalizados se guardan como una definición diaria con una regla
asociada a la versión. En semanas parcialmente activas, la cuota se limita a los
días disponibles. Los días no programados y los archivados no interrumpen rachas.

## Registros y subtareas

Un registro es la cantidad total realizada en una fecha. `PUT` reemplaza la
cantidad; no la incrementa. Cero desmarca, y alcanzar el objetivo vigente completa
el hábito. Se rechazan fechas futuras, anteriores al inicio o no programadas.

Cuando hay subtareas vigentes, se completan por fecha y todas deben estar completas
para cumplir el hábito. Su progreso actualiza proporcionalmente la cantidad.
Marcar el hábito completo marca todos los pasos; desmarcarlo los reinicia.
Para cantidades parciales se usan los endpoints de subtareas.

Agregar pasos a un hábito con historial tiene vigencia desde mañana. Un hábito
nuevo sin historial puede tenerlos hoy, o desde su inicio futuro. Eliminarlos
finaliza su vigencia desde mañana, o desde su inicio si aún no comenzaron, sin
borrar registros. El calendario permite corregir los pasos vigentes en la fecha consultada.

## Edición, archivo y rachas

Nombre y descripción cambian inmediatamente. El inicio es inmutable. Cambios de
objetivo, unidad, días o frecuencia rigen desde mañana; si involucran frecuencia
semanal, desde el próximo lunes, o desde un inicio futuro posterior a esa fecha.
Una nueva edición reemplaza ajustes futuros pendientes y conserva versiones pasadas.
La respuesta incluye `cambiosDesde`.

Archivar/restaurar rige desde mañana o desde el inicio futuro. Hasta esa fecha se
mantiene el estado vigente. `DELETE /api/habitos/:id` archiva de forma lógica.

Una racha cuenta períodos consecutivos cumplidos. El período actual abierto e
incompleto conserva la racha anterior; falla al cerrar. Las cuotas semanales
cuentan semanas. Si cambia la frecuencia, la racha sigue expresando períodos y
no una duración uniforme en días.

## Estadísticas y medallas

El dashboard compara oportunidades diarias completadas con las programadas. Sin
oportunidades, el porcentaje es `null` y se presenta como «—».

Las estadísticas por semana, mes, año o rango se calculan con el historial completo,
sin usar el recorte de períodos enviado para presentación. Incluyen obligaciones
actuales pendientes y excluyen futuras. Las cuotas flexibles son una obligación
semanal, asignada al domingo. Los rangos personalizados admiten hasta 366 días.

El `porcentaje` histórico del listado/detalle por hábito mantiene otra regla: compara
períodos cerrados y períodos actuales ya cumplidos; los actuales abiertos e
incompletos no penalizan. Al mostrar porcentajes, conservar esta distinción entre
la métrica histórica y el resumen del período seleccionado. En la respuesta de
estadísticas, `porHabito[].porcentaje` corresponde al período seleccionado.

Seis medallas persistentes reconocen la primera finalización, rachas de 7 y 30
días programados, 50 y 100 finalizaciones, y una semana completa perfecta.
Las medallas diarias no convierten semanas en días. Desbloqueos y fechas son
permanentes; confirmar su visualización no los elimina.

## Recordatorios y límites

Los avisos son internos a la aplicación. El backend los genera al consultar
notificaciones según horario y zona del perfil, recuperando hasta siete días
recientes desde la activación. La unicidad hábito/fecha/hora evita duplicados.
El cliente consulta al ingresar, recuperar foco y cada minuto visible; los
temporizadores refrescan datos, sin actuar como un servicio de envío en segundo plano.

- Hasta 100 hábitos por cuenta, incluidos los archivados.
- Hasta 30 subtareas por hábito.
- Seguimiento retroactivo limitado a 3660 días.
- Cantidades de hasta 1 000 000, con tres decimales; objetivo mínimo 0,001.
- Listado/detalle con hasta 90 registros y 60 períodos recientes para presentación;
  el cálculo completo de rachas usa el historial disponible.
- Calendario de un mes por petición, con días adyacentes para cuotas semanales.
- La consulta de notificaciones devuelve hasta 100 avisos recientes.
