CREATE TABLE IF NOT EXISTS usuario_perfiles (
 usuario_id INT UNSIGNED NOT NULL PRIMARY KEY,
 zona_horaria VARCHAR(80) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
 bio VARCHAR(280) NOT NULL DEFAULT '',
 avatar MEDIUMBLOB NULL,
 sesion_version INT UNSIGNED NOT NULL DEFAULT 0,
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS password_recuperaciones (
 token_hash CHAR(64) NOT NULL PRIMARY KEY,
 usuario_id INT UNSIGNED NOT NULL,
 expira_en DATETIME NOT NULL,
 usado_en DATETIME NULL,
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
 INDEX recuperacion_usuario (usuario_id, expira_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS habito_reglas (
 version_id INT UNSIGNED NOT NULL PRIMARY KEY,
 intervalo_dias SMALLINT UNSIGNED NOT NULL DEFAULT 1,
 FOREIGN KEY (version_id) REFERENCES habito_versiones(id),
 CHECK (intervalo_dias BETWEEN 1 AND 365)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS habito_subtareas (
 id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 habito_id INT UNSIGNED NOT NULL,
 nombre VARCHAR(120) NOT NULL,
 desde DATE NOT NULL,
 hasta DATE NULL,
 FOREIGN KEY (habito_id) REFERENCES habitos(id),
 INDEX subtareas_habito (habito_id, desde, hasta),
 CHECK (hasta IS NULL OR hasta >= desde)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS subtarea_registros (
 subtarea_id INT UNSIGNED NOT NULL,
 fecha DATE NOT NULL,
 completado BOOLEAN NOT NULL DEFAULT FALSE,
 PRIMARY KEY (subtarea_id, fecha),
 FOREIGN KEY (subtarea_id) REFERENCES habito_subtareas(id),
 INDEX subtareas_fecha (fecha, subtarea_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS usuario_logros (
 usuario_id INT UNSIGNED NOT NULL,
 codigo VARCHAR(40) NOT NULL,
 desbloqueado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 visto BOOLEAN NOT NULL DEFAULT FALSE,
 PRIMARY KEY (usuario_id, codigo),
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS habito_recordatorios (
 habito_id INT UNSIGNED NOT NULL PRIMARY KEY,
 hora CHAR(5) NOT NULL,
 activo BOOLEAN NOT NULL DEFAULT TRUE,
 desde DATE NOT NULL,
 FOREIGN KEY (habito_id) REFERENCES habitos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS usuario_notificaciones (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 usuario_id INT UNSIGNED NOT NULL,
 habito_id INT UNSIGNED NOT NULL,
 fecha DATE NOT NULL,
 hora CHAR(5) NOT NULL,
 leido BOOLEAN NOT NULL DEFAULT FALSE,
 creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY notificacion_unica (habito_id, fecha, hora),
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
 FOREIGN KEY (habito_id) REFERENCES habitos(id),
 INDEX notificaciones_usuario (usuario_id, leido, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
