-- =====================================================================
-- Upgrade "Sezione Luxury" (agosto 2026)
--
-- COSA FA
-- 1) Aggiunge a "properties" la colonna:
--    - is_luxury: booleano (default false) per contrassegnare gli immobili di lusso/pregio.
-- 2) Ricrea la vista "properties_public" includendo la colonna is_luxury
--    in modo che le pagine pubbliche (catalogo, home e /luxury) possano
--    distinguere gli immobili luxury da quelli standard.
--
-- COME APPLICARLA
-- Dashboard Supabase del progetto -> SQL Editor -> incolla questo file -> Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Nuova colonna is_luxury su public.properties
-- ---------------------------------------------------------------------
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_luxury boolean NOT NULL DEFAULT false;

-- Indice per ottimizzare le query filtrate su is_luxury
CREATE INDEX IF NOT EXISTS properties_is_luxury_idx ON public.properties(is_luxury);

-- ---------------------------------------------------------------------
-- 2) Aggiornamento della vista pubblica "properties_public"
--    (Facciamo DROP prima per evitare l'errore di Postgres 42P16 sul riordino colonne)
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS public.properties_public;

CREATE VIEW public.properties_public AS
SELECT
  id,
  created_at,
  title,
  status,
  price,
  zone,
  property_type,
  rooms,
  bathrooms,
  sqm,
  description,
  reel_url,
  has_parking,
  is_featured,
  images,
  is_luxury
FROM public.properties
WHERE is_visible = true
  AND deleted_at IS NULL;

-- ---------------------------------------------------------------------
-- 3) Permessi SELECT sulla vista per anon e authenticated
-- ---------------------------------------------------------------------
GRANT SELECT ON public.properties_public TO anon, authenticated;
