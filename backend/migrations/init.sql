-- =====================================================================
-- Tunisia Circular — database schema v2
-- PostgreSQL 15 + PostGIS. Idempotent: safe to run several times.
-- NOTE: v2 is NOT compatible with the v1 schema (roles generator/processor).
--       Reset the database before the first run (docker compose down -v).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(80) UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS markets (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(80) UNIQUE NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  gouvernorat VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- Users (seller = vendeur, buyer = acheteur, collector = point de collecte)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('seller', 'buyer', 'collector', 'admin')),
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  phone VARCHAR(30),
  bio TEXT,
  avatar_url TEXT,
  gouvernorat VARCHAR(100),
  address TEXT,
  lat DOUBLE PRECISION CHECK (lat IS NULL OR lat BETWEEN 30 AND 38.5),
  lng DOUBLE PRECISION CHECK (lng IS NULL OR lng BETWEEN 7 AND 12.5),
  location GEOMETRY(Point, 4326) GENERATED ALWAYS AS (
    CASE WHEN lat IS NULL OR lng IS NULL THEN NULL
         ELSE ST_SetSRID(ST_MakePoint(lng, lat), 4326) END
  ) STORED,
  category_ids INTEGER[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_location ON users USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_users_categories ON users USING GIN(category_ids);
CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON users USING GIN(name gin_trgm_ops);

-- ---------------------------------------------------------------------
-- Products (seller listings)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  market_id INTEGER REFERENCES markets(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  unit VARCHAR(10) NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 't', 'l', 'unit')),
  quantity_available NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  price_per_unit NUMERIC(12, 3) CHECK (price_per_unit IS NULL OR price_per_unit >= 0),
  min_order_quantity NUMERIC(14, 2) CHECK (min_order_quantity IS NULL OR min_order_quantity > 0),
  images TEXT[] NOT NULL DEFAULT '{}',
  gouvernorat VARCHAR(100),
  address TEXT,
  lat DOUBLE PRECISION CHECK (lat IS NULL OR lat BETWEEN 30 AND 38.5),
  lng DOUBLE PRECISION CHECK (lng IS NULL OR lng BETWEEN 7 AND 12.5),
  location GEOMETRY(Point, 4326) GENERATED ALWAYS AS (
    CASE WHEN lat IS NULL OR lng IS NULL THEN NULL
         ELSE ST_SetSRID(ST_MakePoint(lng, lat), 4326) END
  ) STORED,
  available_from DATE,
  available_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_market ON products(market_id);
CREATE INDEX IF NOT EXISTS idx_products_location ON products USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_products_title_trgm ON products USING GIN(title gin_trgm_ops);

-- ---------------------------------------------------------------------
-- Posts (seller / collection point publications)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  images TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id, created_at DESC);

-- ---------------------------------------------------------------------
-- Discounts (remises vendeur)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  percentage NUMERIC(5, 2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  min_quantity NUMERIC(14, 2) CHECK (min_quantity IS NULL OR min_quantity > 0),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_discounts_product ON discounts(product_id);
CREATE INDEX IF NOT EXISTS idx_discounts_period ON discounts(starts_at, ends_at) WHERE is_active;

-- ---------------------------------------------------------------------
-- Collection points, schedules, storage
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS collection_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT,
  gouvernorat VARCHAR(100) NOT NULL,
  lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN 30 AND 38.5),
  lng DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN 7 AND 12.5),
  location GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) STORED,
  phone VARCHAR(30),
  email VARCHAR(255),
  storage_capacity_kg NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (storage_capacity_kg >= 0),
  category_ids INTEGER[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cp_manager ON collection_points(manager_id);
CREATE INDEX IF NOT EXISTS idx_cp_location ON collection_points USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_cp_categories ON collection_points USING GIN(category_ids);

CREATE TABLE IF NOT EXISTS collection_point_schedules (
  id SERIAL PRIMARY KEY,
  collection_point_id UUID NOT NULL REFERENCES collection_points(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = dimanche
  opens_at TIME,
  closes_at TIME,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (collection_point_id, day_of_week),
  CHECK (is_closed OR (opens_at IS NOT NULL AND closes_at IS NOT NULL AND closes_at > opens_at))
);

CREATE TABLE IF NOT EXISTS stock_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_point_id UUID NOT NULL REFERENCES collection_points(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  label VARCHAR(200) NOT NULL,
  quantity_kg NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (quantity_kg >= 0),
  min_threshold_kg NUMERIC(14, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (collection_point_id, label)
);

-- ---------------------------------------------------------------------
-- Buyer requests (demandes) and responses
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS buy_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  market_id INTEGER REFERENCES markets(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  quantity NUMERIC(14, 2) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(10) NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 't', 'l', 'unit')),
  max_price_per_unit NUMERIC(12, 3) CHECK (max_price_per_unit IS NULL OR max_price_per_unit >= 0),
  gouvernorat VARCHAR(100),
  lat DOUBLE PRECISION CHECK (lat IS NULL OR lat BETWEEN 30 AND 38.5),
  lng DOUBLE PRECISION CHECK (lng IS NULL OR lng BETWEEN 7 AND 12.5),
  location GEOMETRY(Point, 4326) GENERATED ALWAYS AS (
    CASE WHEN lat IS NULL OR lng IS NULL THEN NULL
         ELSE ST_SetSRID(ST_MakePoint(lng, lat), 4326) END
  ) STORED,
  needed_by DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'fulfilled', 'closed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_requests_buyer ON buy_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON buy_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_location ON buy_requests USING GIST(location);

CREATE TABLE IF NOT EXISTS request_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES buy_requests(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  message TEXT,
  proposed_quantity NUMERIC(14, 2) CHECK (proposed_quantity IS NULL OR proposed_quantity > 0),
  proposed_price_per_unit NUMERIC(12, 3) CHECK (proposed_price_per_unit IS NULL OR proposed_price_per_unit >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (request_id, responder_id)
);

-- ---------------------------------------------------------------------
-- Offers (published by collection points)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publisher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collection_point_id UUID REFERENCES collection_points(id) ON DELETE SET NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  market_id INTEGER REFERENCES markets(id) ON DELETE SET NULL,
  stock_item_id UUID REFERENCES stock_items(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  quantity NUMERIC(14, 2) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(10) NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 't', 'l', 'unit')),
  price_per_unit NUMERIC(12, 3) CHECK (price_per_unit IS NULL OR price_per_unit >= 0),
  gouvernorat VARCHAR(100),
  lat DOUBLE PRECISION CHECK (lat IS NULL OR lat BETWEEN 30 AND 38.5),
  lng DOUBLE PRECISION CHECK (lng IS NULL OR lng BETWEEN 7 AND 12.5),
  location GEOMETRY(Point, 4326) GENERATED ALWAYS AS (
    CASE WHEN lat IS NULL OR lng IS NULL THEN NULL
         ELSE ST_SetSRID(ST_MakePoint(lng, lat), 4326) END
  ) STORED,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ends_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed', 'cancelled')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status, starts_at);
CREATE INDEX IF NOT EXISTS idx_offers_location ON offers USING GIST(location);

-- ---------------------------------------------------------------------
-- Purchases (opérations d'achat des points de collecte)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_point_id UUID NOT NULL REFERENCES collection_points(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  stock_item_id UUID REFERENCES stock_items(id) ON DELETE SET NULL,
  label VARCHAR(200) NOT NULL,
  quantity_kg NUMERIC(14, 2) NOT NULL CHECK (quantity_kg > 0),
  unit_price NUMERIC(12, 3) CHECK (unit_price IS NULL OR unit_price >= 0),
  total_amount NUMERIC(16, 3) GENERATED ALWAYS AS (quantity_kg * COALESCE(unit_price, 0)) STORED,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'received', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_purchases_point ON purchases(collection_point_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_seller ON purchases(seller_id, created_at DESC);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_point_id UUID NOT NULL REFERENCES collection_points(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('in', 'out', 'adjust')),
  quantity_kg NUMERIC(14, 2) NOT NULL,
  balance_after_kg NUMERIC(14, 2) NOT NULL,
  reason TEXT,
  purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_movements_point ON stock_movements(collection_point_id, created_at DESC);

-- ---------------------------------------------------------------------
-- Chat
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  direct_key TEXT UNIQUE NOT NULL,           -- "<smallest uuid>:<largest uuid>"
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_participants_user ON conversation_participants(user_id);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  attachments TEXT[] NOT NULL DEFAULT '{}',
  context_type VARCHAR(20) CHECK (context_type IS NULL OR context_type IN ('product', 'request', 'offer', 'purchase')),
  context_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(conversation_id, created_at DESC);

-- ---------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  link VARCHAR(255),
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'products', 'posts', 'discounts', 'collection_points',
                           'stock_items', 'buy_requests', 'request_responses', 'offers', 'purchases']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON %1$I', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON %1$I
                    FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- Reference seed (categories / markets)
-- ---------------------------------------------------------------------
INSERT INTO categories (slug, name, description, keywords) VALUES
  ('olive-pomace', 'Grignons d''olive', 'Résidus solides du pressage des olives', ARRAY['grignon','grignons','pomace','olive','margine','noyau']),
  ('used-cooking-oil', 'Huiles alimentaires usagées', 'Huiles de friture collectées', ARRAY['huile','huiles','oil','friture','uco','graisse']),
  ('organic-waste', 'Déchets organiques', 'Déchets alimentaires et biodéchets', ARRAY['organique','organiques','biodechet','alimentaire','food','compost']),
  ('plastic', 'Plastique', 'PET, PEHD, films plastiques', ARRAY['plastique','pet','pehd','bouteille','film','plastic']),
  ('paper-cardboard', 'Papier & carton', 'Cartons, papiers, emballages', ARRAY['papier','carton','cardboard','paper','emballage']),
  ('metal', 'Métaux', 'Ferraille, aluminium, cuivre', ARRAY['metal','ferraille','aluminium','cuivre','fer','canette']),
  ('glass', 'Verre', 'Bouteilles et bocaux en verre', ARRAY['verre','glass','bocal']),
  ('textile', 'Textile', 'Vêtements et chutes textiles', ARRAY['textile','tissu','vetement','coton'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO markets (slug, name, description, gouvernorat) VALUES
  ('local', 'Marché local', 'Échanges dans le même gouvernorat', NULL),
  ('national', 'Marché national', 'Échanges entre gouvernorats', NULL),
  ('export', 'Marché export', 'Matières destinées à l''export', NULL),
  ('wholesale-bir-el-kassaa', 'Marché de gros Bir El Kassaa', 'Marché de gros du Grand Tunis', 'Ben Arous')
ON CONFLICT (slug) DO NOTHING;
