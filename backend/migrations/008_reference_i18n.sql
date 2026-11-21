-- =====================================================================
-- 008 — Bilingual reference data (fr / ar) + Tunisian food-service categories
-- Categories and markets get their Arabic name/description in `i18n`, and
-- Arabic search keywords in `i18n.keywords.ar` (used by the smart search).
-- Idempotent (upserts on slug).
-- =====================================================================

-- New categories for the waste produced by bakeries, cafés, restaurants and agrifood plants
INSERT INTO categories (slug, name, description, keywords) VALUES
  ('bread-surplus', 'Pain & viennoiseries invendus', 'Pain rassis, baguettes, tabouna et viennoiseries invendus', ARRAY['pain','baguette','tabouna','mlawi','viennoiserie','boulangerie','rassis','khobz']),
  ('coffee-grounds', 'Marc de café', 'Marc de café des cafés, restaurants et torréfacteurs', ARRAY['marc','cafe','express','torrefaction','pellicule']),
  ('agrifood-byproducts', 'Coproduits agroalimentaires', 'Son de blé, lactosérum, pelures de tomate, écorces d''agrumes, déchets de poisson…', ARRAY['son','lactoserum','petit-lait','pelure','tomate','ecorce','agrume','orange','piment','harissa','poisson','sardine','semoule','coproduit'])
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, keywords = EXCLUDED.keywords;

UPDATE categories c SET i18n = v.i18n::jsonb FROM (VALUES
  ('olive-pomace',        '{"name":{"fr":"Grignons d''olive","ar":"فيتورة الزيتون"},"description":{"fr":"Résidus solides du pressage des olives","ar":"البقايا الصلبة لعصر الزيتون"},"keywords":{"ar":["فيتورة","فيطورة","نواة","عظم الزيتون","مرجين","زيتون"]}}'),
  ('used-cooking-oil',    '{"name":{"fr":"Huiles alimentaires usagées","ar":"زيوت الطهي المستعملة"},"description":{"fr":"Huiles de friture collectées","ar":"زيوت القلي المجمّعة"},"keywords":{"ar":["زيت","زيوت","قلي","مستعمل","فريتور"]}}'),
  ('organic-waste',       '{"name":{"fr":"Déchets organiques","ar":"الفضلات العضوية"},"description":{"fr":"Déchets alimentaires et biodéchets","ar":"فضلات غذائية وبيولوجية"},"keywords":{"ar":["عضوي","عضويه","فضلات","خضرة","غلال","قشور","سماد","كومبوست"]}}'),
  ('plastic',             '{"name":{"fr":"Plastique","ar":"البلاستيك"},"description":{"fr":"PET, PEHD, films plastiques","ar":"PET، PEHD، أغشية بلاستيكية"},"keywords":{"ar":["بلاستيك","قوارير","قرعة","بلاستيكي","ميكة"]}}'),
  ('paper-cardboard',     '{"name":{"fr":"Papier & carton","ar":"الورق والكرتون"},"description":{"fr":"Cartons, papiers, emballages","ar":"كرتون، ورق، تغليف"},"keywords":{"ar":["كرتون","كارتون","ورق","كاغط","تغليف"]}}'),
  ('metal',               '{"name":{"fr":"Métaux","ar":"المعادن"},"description":{"fr":"Ferraille, aluminium, cuivre","ar":"خردة، ألمنيوم، نحاس"},"keywords":{"ar":["حديد","خرده","ألمنيوم","المنيوم","نحاس","معادن","كانات"]}}'),
  ('glass',               '{"name":{"fr":"Verre","ar":"البلّور"},"description":{"fr":"Bouteilles et bocaux en verre","ar":"قوارير وأوعية بلّورية"},"keywords":{"ar":["بلور","زجاج","قوارير بلور"]}}'),
  ('textile',             '{"name":{"fr":"Textile","ar":"النسيج"},"description":{"fr":"Vêtements et chutes textiles","ar":"ملابس وبقايا نسيج"},"keywords":{"ar":["نسيج","قماش","ملابس","دجين","قطن","شيفون"]}}'),
  ('bread-surplus',       '{"name":{"fr":"Pain & viennoiseries invendus","ar":"الخبز والمعجنات غير المباعة"},"description":{"fr":"Pain rassis, baguettes, tabouna et viennoiseries invendus","ar":"خبز يابس، باقات، طابونة ومعجنات غير مباعة"},"keywords":{"ar":["خبز","خبزه","باقات","طابونه","ملاوي","يابس","مخبزه"]}}'),
  ('coffee-grounds',      '{"name":{"fr":"Marc de café","ar":"تفل القهوة"},"description":{"fr":"Marc de café des cafés, restaurants et torréfacteurs","ar":"تفل القهوة من المقاهي والمطاعم والمحمصات"},"keywords":{"ar":["تفل","قهوه","كافي","حماص","محمصه"]}}'),
  ('agrifood-byproducts', '{"name":{"fr":"Coproduits agroalimentaires","ar":"المنتجات الثانوية الغذائية"},"description":{"fr":"Son de blé, lactosérum, pelures de tomate, écorces d''agrumes, déchets de poisson…","ar":"نخالة القمح، مصل الحليب، قشور الطماطم، قشور القوارص، فضلات السمك…"},"keywords":{"ar":["نخاله","سداري","مصل","لبن","قشور","طماطم","قوارص","برتقال","فلفل","هريسه","حوت","سردينه","سميد"]}}')
) AS v(slug, i18n) WHERE c.slug = v.slug;

UPDATE markets m SET i18n = v.i18n::jsonb FROM (VALUES
  ('local',                   '{"name":{"fr":"Marché local","ar":"السوق المحلية"},"description":{"fr":"Échanges dans le même gouvernorat","ar":"مبادلات داخل نفس الولاية"}}'),
  ('national',                '{"name":{"fr":"Marché national","ar":"السوق الوطنية"},"description":{"fr":"Échanges entre gouvernorats","ar":"مبادلات بين الولايات"}}'),
  ('export',                  '{"name":{"fr":"Marché export","ar":"سوق التصدير"},"description":{"fr":"Matières destinées à l''export","ar":"مواد موجّهة للتصدير"}}'),
  ('wholesale-bir-el-kassaa', '{"name":{"fr":"Marché de gros Bir El Kassaa","ar":"سوق الجملة ببئر القصعة"},"description":{"fr":"Marché de gros du Grand Tunis","ar":"سوق الجملة لتونس الكبرى"}}')
) AS v(slug, i18n) WHERE m.slug = v.slug;
