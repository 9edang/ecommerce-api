CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255),
  image VARCHAR(255),
  price NUMERIC(6,2),
  description TEXT,
  sku VARCHAR(255)
);