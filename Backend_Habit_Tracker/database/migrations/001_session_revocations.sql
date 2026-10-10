-- Migración aditiva: no modifica usuarios ni elimina datos existentes.
CREATE TABLE IF NOT EXISTS sesiones_revocadas (
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expira_en DATETIME NOT NULL,
  PRIMARY KEY (token_hash),
  KEY sesiones_revocadas_expira (expira_en)
) ENGINE=InnoDB;
