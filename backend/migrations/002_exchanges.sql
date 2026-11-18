-- =====================================================================
-- Exchange proposals (troc) — e.g. "for every 5 L of used oil you bring,
-- I give 1 L of soap". Idempotent.
-- =====================================================================

CREATE TABLE IF NOT EXISTS exchange_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- what the author wants to receive (per unit of exchange)
  wanted_category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  wanted_label VARCHAR(200) NOT NULL,
  wanted_quantity NUMERIC(14, 2) NOT NULL CHECK (wanted_quantity > 0),
  wanted_unit VARCHAR(10) NOT NULL DEFAULT 'kg' CHECK (wanted_unit IN ('kg', 't', 'l', 'unit')),
  -- what the author gives in return
  given_label VARCHAR(200) NOT NULL,
  given_quantity NUMERIC(14, 2) NOT NULL CHECK (given_quantity > 0),
  given_unit VARCHAR(10) NOT NULL DEFAULT 'unit' CHECK (given_unit IN ('kg', 't', 'l', 'unit')),
  image_url TEXT,
  description TEXT,
  max_total_wanted NUMERIC(14, 2) CHECK (max_total_wanted IS NULL OR max_total_wanted > 0),
  gouvernorat VARCHAR(100),
  lat DOUBLE PRECISION CHECK (lat IS NULL OR lat BETWEEN 30 AND 38.5),
  lng DOUBLE PRECISION CHECK (lng IS NULL OR lng BETWEEN 7 AND 12.5),
  location GEOMETRY(Point, 4326) GENERATED ALWAYS AS (
    CASE WHEN lat IS NULL OR lng IS NULL THEN NULL
         ELSE ST_SetSRID(ST_MakePoint(lng, lat), 4326) END
  ) STORED,
  expires_at DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_exchanges_feed ON exchange_offers(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exchanges_author ON exchange_offers(author_id);

CREATE TABLE IF NOT EXISTS exchange_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exchange_id UUID NOT NULL REFERENCES exchange_offers(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity_offered NUMERIC(14, 2) NOT NULL CHECK (quantity_offered > 0),
  message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (exchange_id, responder_id)
);

DROP TRIGGER IF EXISTS trg_exchange_offers_updated_at ON exchange_offers;
CREATE TRIGGER trg_exchange_offers_updated_at BEFORE UPDATE ON exchange_offers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_exchange_responses_updated_at ON exchange_responses;
CREATE TRIGGER trg_exchange_responses_updated_at BEFORE UPDATE ON exchange_responses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
