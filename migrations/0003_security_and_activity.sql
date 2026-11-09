-- Registro de quién hizo qué en el admin (productos, categorías, pedidos)
CREATE TABLE activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Límite de pedidos por persona: solo se guarda una huella (hash) de la IP y se borra pasada una hora
CREATE TABLE order_attempts (
  ip_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_order_attempts ON order_attempts(ip_hash, created_at);

-- Prueba de la autorización de tratamiento de datos personales (Ley 1581 de 2012)
ALTER TABLE orders ADD COLUMN privacy_accepted_at TEXT;
