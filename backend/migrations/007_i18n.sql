-- =====================================================================
-- 007 — Internationalisation (fr / ar)
--
-- Translatable rows get an `i18n` JSONB column shaped { field: { fr, ar } }.
-- The plain columns keep the source text (French when available) so search,
-- sorting, constraints and existing queries keep working; the API picks the
-- requested language from `i18n` and falls back to the plain column.
-- Idempotent.
-- =====================================================================

ALTER TABLE categories        ADD COLUMN IF NOT EXISTS i18n JSONB NOT NULL DEFAULT '{}'::jsonb; -- name, description
ALTER TABLE markets           ADD COLUMN IF NOT EXISTS i18n JSONB NOT NULL DEFAULT '{}'::jsonb; -- name, description
ALTER TABLE products          ADD COLUMN IF NOT EXISTS i18n JSONB NOT NULL DEFAULT '{}'::jsonb; -- title, description
ALTER TABLE discounts         ADD COLUMN IF NOT EXISTS i18n JSONB NOT NULL DEFAULT '{}'::jsonb; -- title, description
ALTER TABLE collection_points ADD COLUMN IF NOT EXISTS i18n JSONB NOT NULL DEFAULT '{}'::jsonb; -- name, description
ALTER TABLE stock_items       ADD COLUMN IF NOT EXISTS i18n JSONB NOT NULL DEFAULT '{}'::jsonb; -- label
ALTER TABLE buy_requests      ADD COLUMN IF NOT EXISTS i18n JSONB NOT NULL DEFAULT '{}'::jsonb; -- title, description
ALTER TABLE offers            ADD COLUMN IF NOT EXISTS i18n JSONB NOT NULL DEFAULT '{}'::jsonb; -- title, description
ALTER TABLE exchange_offers   ADD COLUMN IF NOT EXISTS i18n JSONB NOT NULL DEFAULT '{}'::jsonb; -- wanted_label, given_label, description
ALTER TABLE posts             ADD COLUMN IF NOT EXISTS i18n JSONB NOT NULL DEFAULT '{}'::jsonb; -- content
ALTER TABLE notifications     ADD COLUMN IF NOT EXISTS i18n JSONB NOT NULL DEFAULT '{}'::jsonb; -- title, message (both languages written at creation)

-- Interface language chosen by the user (restored on every device).
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_lang VARCHAR(2) NOT NULL DEFAULT 'fr';
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_preferred_lang_check CHECK (preferred_lang IN ('fr', 'ar'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Search inside translations (Arabic titles/labels) — trigram-free, simple GIN on the document.
CREATE INDEX IF NOT EXISTS idx_products_i18n     ON products     USING GIN (i18n jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_buy_requests_i18n ON buy_requests USING GIN (i18n jsonb_path_ops);
