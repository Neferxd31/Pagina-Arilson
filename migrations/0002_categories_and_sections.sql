-- Las categorías pasan a ser administrables; products.category guarda el slug de la categoría
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

INSERT INTO categories (slug, name, position) VALUES
  ('celular', 'Accesorios para celular', 1),
  ('tecnologia-personal', 'Tecnología personal', 2),
  ('hogar-oficina', 'Hogar y oficina', 3);

-- Marca para la fila "Nuevos" del inicio ("Ofertas" sale sola del precio anterior)
ALTER TABLE products ADD COLUMN is_new INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_products_category ON products(category, is_active);
