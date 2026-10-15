-- =====================================================
-- All Design Cocinas – estructura de la base de datos (Cloudflare D1)
-- Ejecutar UNA sola vez, antes de 2-datos.sql
-- =====================================================

-- Información general y página de inicio (una sola fila, id = 1)
CREATE TABLE IF NOT EXISTS sitio (
  id              INTEGER PRIMARY KEY CHECK (id = 1),
  titulo          TEXT NOT NULL DEFAULT '',
  descripcion     TEXT NOT NULL DEFAULT '',
  titulo_pie      TEXT NOT NULL DEFAULT '',
  celular1        TEXT NOT NULL DEFAULT '',
  telefono_fijo   TEXT NOT NULL DEFAULT '',
  celular2        TEXT NOT NULL DEFAULT '',
  footer_info     TEXT NOT NULL DEFAULT '',
  correo          TEXT NOT NULL DEFAULT '',
  facebook        TEXT NOT NULL DEFAULT '',
  instagram       TEXT NOT NULL DEFAULT '',
  linkedin        TEXT NOT NULL DEFAULT '',
  youtube         TEXT NOT NULL DEFAULT '',
  tiktok          TEXT NOT NULL DEFAULT '',
  pinterest       TEXT NOT NULL DEFAULT '',
  google          TEXT NOT NULL DEFAULT '',
  galeria_inicio  TEXT NOT NULL DEFAULT '[]',   -- JSON: [{ "imagen": "...", "alt": "..." }]
  actualizado     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cocinas integrales, otros productos y promociones (comparten formulario)
CREATE TABLE IF NOT EXISTS catalogo (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo              TEXT NOT NULL CHECK (tipo IN ('cocinas', 'productos', 'promociones')),
  slug              TEXT NOT NULL,
  titulo            TEXT NOT NULL,
  descripcion       TEXT NOT NULL DEFAULT '',
  galeria           TEXT NOT NULL DEFAULT '[]',  -- JSON: ["foto1.webp", ...] (la primera es la portada)
  orden             INTEGER NOT NULL DEFAULT 0,
  precio            INTEGER,                      -- solo promociones
  precio_descuento  INTEGER,                      -- solo promociones
  nota              TEXT NOT NULL DEFAULT '',     -- solo promociones
  publicado         INTEGER NOT NULL DEFAULT 1,
  creado            TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (tipo, slug)
);
CREATE INDEX IF NOT EXISTS idx_catalogo_tipo ON catalogo (tipo, publicado, orden);

-- Entradas del blog
CREATE TABLE IF NOT EXISTS entradas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT NOT NULL UNIQUE,
  titulo       TEXT NOT NULL,
  fecha        TEXT NOT NULL,                 -- AAAA-MM-DD
  imagen       TEXT NOT NULL DEFAULT '',
  contenido    TEXT NOT NULL DEFAULT '',
  publicado    INTEGER NOT NULL DEFAULT 1,
  creado       TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_entradas_fecha ON entradas (publicado, fecha DESC);

-- Intentos de inicio de sesión (protección contra adivinar la contraseña)
CREATE TABLE IF NOT EXISTS intentos_login (
  ip     TEXT NOT NULL,
  fecha  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_intentos ON intentos_login (ip, fecha);
