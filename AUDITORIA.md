# Habitly: auditoría y decisiones de actualización

## Arquitectura existente

Frontend React 19 con Vite, React Router y AuthProvider. Rutas públicas Home, Registro e IniciarSesion; rutas privadas dashboard, hábitos (lista, formulario y detalle), historial, estadísticas y configuración. Servicios authApi/habitsApi y hooks useHabitsResource/useDashboardHabits. CSS modular con tokens en variables.css, base.css, auth.css, dashboard.css y habits.css, sin framework CSS.

Backend Express 5: rutas → controladores → servicios → repositorio de hábitos. Pool mysql2 con consultas parametrizadas; transacciones y bloqueo del hábito verifican usuario_id. Autenticación JWT HS256 en cookie HttpOnly, bcrypt 12, revocación persistente, validación de origen y límite de intentos.

Esquema disponible en SQL: usuarios, sesiones_revocadas, habitos, habito_versiones y habito_registros. Versiones con fecha de vigencia conservan objetivos/frecuencias anteriores; registros únicos por hábito y fecha. Archivar conserva el historial. Frecuencias existentes: diario, cuota semanal flexible y días específicos.

## Hallazgos

- Estadísticas construidas a partir de periodos recortados a 60: resultados antiguos incompletos.
- Zona horaria fija en backend y frontend.
- Perfil de solo lectura; sin subtareas, medallas, recuperación ni recordatorios.
- Cambiar contraseña debe revocar todas las sesiones, incluidas cookies copiadas.
- No hay almacenamiento de imágenes configurado; se usará MySQL para el avatar normalizado y privado.
- No hay Git en los directorios: se conservarán archivos existentes y se documentarán cambios.
- La conexión inicial a MySQL respondió ECONNREFUSED. No se ejecutaron migraciones sobre la base existente.

## Plan y preservación

Migración 003 exclusivamente aditiva: tablas para perfiles, recuperación, reglas por versión, subtareas y sus registros, logros, recordatorios y notificaciones. Sin ALTER de tablas originales ni DROP. Subtareas con fechas de vigencia; borrar es finalizar su vigencia, conservando registros. Las modificaciones de frecuencia siguen las reglas existentes de vigencia. Nuevas reglas cada N días se anclan en la fecha inicial.

Estadísticas semanales, mensuales y anuales con rangos validados y denominador basado en obligaciones programadas. Semanas flexibles se evalúan como una obligación semanal. Logros permanentes y únicos, derivados de registros reales. Recordatorios evaluados en el servidor según zona IANA, hasta siete días recientes desde su activación, con unicidad por hábito/fecha/hora.

Recuperación con token aleatorio de 32 bytes, digest SHA-256, expiración de 30 minutos y consumo atómico; SMTP configurable sin simular envío. Avatares JPEG/PNG/WebP de hasta 2 MB, límite de píxeles, decodificación y nueva codificación WebP. Tests de lógica y API en base aislada; no se modifican credenciales ni archivos .env.
