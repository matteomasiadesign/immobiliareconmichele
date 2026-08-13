-- =====================================================================
-- Upgrade "Immobili <-> Incarichi" (agosto 2026)
--
-- COSA FA
-- 1) Aggiunge a "properties" i campi che servono solo al gestionale:
--    - is_visible: se l'annuncio e' pubblicato sul sito o no
--    - acquisition_date / expiry_date: date di acquisizione e scadenza
--      dell'incarico legato all'immobile, visibili SOLO in admin
-- 2) Aggiunge a "transactions" un vero collegamento all'immobile
--    (property_id), cosi' un incarico puo' riferirsi a un annuncio reale
--    invece che a un semplice testo libero.
-- 3) Crea la vista "properties_public": e' quello che il sito pubblico
--    (index.html, catalogo.html) usa al posto della tabella diretta.
--    Espone solo gli annunci con is_visible = true e NON include le
--    colonne acquisition_date / expiry_date, che restano visibili solo
--    a chi accede da admin.html.
--
-- COME APPLICARLA
-- Dashboard Supabase del progetto -> SQL Editor -> incolla tutto questo
-- file -> Run. E' idempotente: si puo' rieseguire senza problemi.
--
-- DOPO AVERLA APPLICATA
-- Esegui anche di nuovo (o per la prima volta) supabase-rls-policies.sql:
-- la policy "properties_public_read" li' dentro e' stata aggiornata per
-- non permettere piu' la lettura anonima diretta della tabella
-- "properties" (che ora contiene le date riservate) - la lettura
-- pubblica passa dalla vista "properties_public" creata qui.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) Nuove colonne su "properties"
-- ---------------------------------------------------------------------
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS acquisition_date date,
  ADD COLUMN IF NOT EXISTS expiry_date date;


-- ---------------------------------------------------------------------
-- 2) Collegamento "transactions" -> "properties"
--    (rileva automaticamente il tipo di properties.id, per non
--    assumere se e' bigint o uuid)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  id_type text;
BEGIN
  SELECT data_type INTO id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'id';

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'property_id'
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.transactions ADD COLUMN property_id %s REFERENCES public.properties(id) ON DELETE SET NULL',
      id_type
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS transactions_property_id_idx ON public.transactions(property_id);


-- ---------------------------------------------------------------------
-- 3) Vista pubblica: e' quella usata dal sito (anon). Non contiene
--    acquisition_date, expiry_date, is_visible: quei dati restano
--    leggibili solo da chi e' autenticato sulla tabella "properties".
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.properties_public AS
SELECT
  id, created_at, title, status, price, zone, property_type,
  rooms, bathrooms, sqm, description, reel_url, has_parking,
  is_featured, images
FROM public.properties
WHERE is_visible = true;

GRANT SELECT ON public.properties_public TO anon, authenticated;
