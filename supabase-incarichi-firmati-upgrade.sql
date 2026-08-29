-- =====================================================================
-- Upgrade "Incarichi Firmati & Statistiche" (agosto 2026)
--
-- COSA FA
-- 1) Aggiunge a "properties" i campi per tracciare se l'incarico è
--    stato firmato e la relativa durata:
--    - has_mandate: boolean (default false)
--    - mandate_duration: text (default '6 mesi')
-- 2) NON cancella alcun dato: la distinzione tra bozze e incarichi
--    firmati viene gestita in modo sicuro dal gestionale.
-- 3) Aggiorna la vista "properties_public" per il sito pubblico.
--
-- COME APPLICARLA
-- Dashboard Supabase del tuo progetto -> SQL Editor -> Incolla -> Run.
-- =====================================================================

-- 1) Aggiunta colonne su public.properties se non esistono
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS has_mandate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mandate_duration text DEFAULT '6 mesi';

-- 2) Aggiorna la vista properties_public per garantire coerenza con le nuove colonne
DROP VIEW IF EXISTS public.properties_public;

CREATE OR REPLACE VIEW public.properties_public AS
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

GRANT SELECT ON public.properties_public TO anon, authenticated;
