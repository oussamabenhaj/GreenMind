-- =====================================================================
-- 009 — CO₂ évité : facteur d'émission par catégorie
--
-- `co2_factor_kg` = kg de CO₂e évités par kg de matière détournée de
-- l'enfouissement ou de l'incinération (valorisation matière/énergie).
-- Facteurs indicatifs (ordres de grandeur ADEME / ICE Database), éditables
-- par catégorie : 0 = aucune estimation connue.
-- Idempotent.
-- =====================================================================

ALTER TABLE categories ADD COLUMN IF NOT EXISTS co2_factor_kg NUMERIC(10, 4) NOT NULL DEFAULT 0;

COMMENT ON COLUMN categories.co2_factor_kg IS
  'kg CO₂e évités par kg de matière détournée de l''enfouissement ou de l''incinération';

UPDATE categories c
SET co2_factor_kg = v.factor
FROM (VALUES
  ('olive-pomace',         0.60), -- grignons : compost / combustible biomasse
  ('used-cooking-oil',     2.85), -- biodiesel en remplacement du gazole
  ('organic-waste',        0.80), -- méthane évité en décharge
  ('plastic',              1.80), -- résine vierge évitée
  ('paper-cardboard',      1.10), -- pâte vierge évitée
  ('metal',                3.50), -- mélange acier / aluminium
  ('glass',                0.60), -- énergie de fusion évitée
  ('textile',              2.50), -- fibres vierges évitées
  ('bread-surplus',        0.80), -- invendus : méthane évité
  ('coffee-grounds',       0.90), -- méthane évité
  ('agrifood-byproducts',  0.70)  -- coproduits : méthane évité
) AS v(slug, factor)
WHERE c.slug = v.slug;
