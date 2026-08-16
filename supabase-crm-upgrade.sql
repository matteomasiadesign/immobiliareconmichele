-- =====================================================================
-- Upgrade CRM (agosto 2026)
--
-- COSA FA
-- 1) "buyers" impara tre cose che prima non sapeva:
--    - email: finora della gente in rubrica c'era solo il telefono
--    - next_action_date / last_contact_at: quando richiamare un cliente e
--      quando lo si e' sentito l'ultima volta. Senza queste due colonne
--      un contatto di tre settimane fa e uno di ieri erano identici, e
--      una richiesta dal sito, una volta letta, spariva per sempre dalla
--      Panoramica senza che nulla garantisse che fosse mai stata richiamata.
-- 2) "documenti_bozze" si collega a un immobile e a un cliente, cosi' la
--    catena immobile -> incarico -> proposta -> vendita esiste anche nei
--    dati e non solo nella realta'.
-- 3) Tutte e quattro le tabelle prendono "deleted_at": eliminare non
--    cancella piu' la riga, la sposta nel Cestino del gestionale, da dove
--    si puo' ripristinare per 30 giorni. Le doppie conferme rallentano
--    l'errore; questa colonna e' quella che lo annulla.
-- 4) La vista pubblica "properties_public" viene rifatta per NON mostrare
--    sul sito gli immobili finiti nel cestino.
--
-- SULLA PRIVACY DEI CLIENTI
-- Le nuove colonne di "buyers" (email compresa) non hanno bisogno di nuove
-- policy: in Supabase la sicurezza e' per RIGA, non per colonna, e la
-- policy "buyers_auth_all" gia' presente copre automaticamente anche le
-- colonne aggiunte oggi. La rubrica resta leggibile solo dopo il login su
-- admin.html. Questo file anzi STRINGE il permesso pubblico: l'unica cosa
-- che un visitatore anonimo puo' fare su "buyers" e' inserire una propria
-- richiesta marcata source='sito' (vedi sezione 5).
--
-- COME APPLICARLA
-- Dashboard Supabase del progetto -> SQL Editor -> incolla tutto questo
-- file -> Run. E' idempotente: si puo' rieseguire senza problemi.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) BUYERS: email, promemoria di richiamo, cestino
-- ---------------------------------------------------------------------
ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS email           text,
  ADD COLUMN IF NOT EXISTS next_action_date date,
  ADD COLUMN IF NOT EXISTS last_contact_at  timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at       timestamptz;

-- L'elenco "Da fare" della Panoramica interroga queste due colonne a ogni
-- accesso: senza indici, con la rubrica che cresce, diventa una scansione
-- completa della tabella.
CREATE INDEX IF NOT EXISTS buyers_next_action_idx ON public.buyers(next_action_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS buyers_deleted_at_idx  ON public.buyers(deleted_at);


-- ---------------------------------------------------------------------
-- 2) TRANSACTIONS e PROPERTIES: cestino
-- ---------------------------------------------------------------------
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.properties   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS transactions_deleted_at_idx ON public.transactions(deleted_at);
CREATE INDEX IF NOT EXISTS properties_deleted_at_idx   ON public.properties(deleted_at);


-- ---------------------------------------------------------------------
-- 3) DOCUMENTI_BOZZE: collegamento a immobile e cliente, piu' cestino.
--    Il tipo di properties.id / buyers.id viene rilevato dallo schema
--    invece di darlo per scontato (bigint o uuid a seconda di come e'
--    nata la tabella), come gia' fatto in
--    supabase-immobili-incarichi-upgrade.sql.
-- ---------------------------------------------------------------------
ALTER TABLE public.documenti_bozze ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

DO $$
DECLARE
  prop_id_type text;
  buyer_id_type text;
BEGIN
  SELECT data_type INTO prop_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'id';

  SELECT data_type INTO buyer_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'buyers' AND column_name = 'id';

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documenti_bozze' AND column_name = 'property_id'
  ) THEN
    -- ON DELETE SET NULL e non CASCADE: se un giorno l'immobile sparisce
    -- davvero, il documento firmato resta. Vale la stessa regola gia'
    -- usata per transactions.property_id.
    EXECUTE format(
      'ALTER TABLE public.documenti_bozze ADD COLUMN property_id %s REFERENCES public.properties(id) ON DELETE SET NULL',
      prop_id_type
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documenti_bozze' AND column_name = 'buyer_id'
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.documenti_bozze ADD COLUMN buyer_id %s REFERENCES public.buyers(id) ON DELETE SET NULL',
      buyer_id_type
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS documenti_bozze_property_id_idx ON public.documenti_bozze(property_id);
CREATE INDEX IF NOT EXISTS documenti_bozze_buyer_id_idx    ON public.documenti_bozze(buyer_id);
CREATE INDEX IF NOT EXISTS documenti_bozze_deleted_at_idx  ON public.documenti_bozze(deleted_at);


-- ---------------------------------------------------------------------
-- 4) VISTA PUBBLICA: un immobile nel cestino non deve restare online.
--    Stesse colonne di prima (nessun dato riservato in piu'), cambia
--    solo la condizione.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.properties_public AS
SELECT
  id, created_at, title, status, price, zone, property_type,
  rooms, bathrooms, sqm, description, reel_url, has_parking,
  is_featured, images
FROM public.properties
WHERE is_visible = true
  AND deleted_at IS NULL;

GRANT SELECT ON public.properties_public TO anon, authenticated;


-- ---------------------------------------------------------------------
-- 5) BUYERS, permesso pubblico piu' stretto.
--
--    Prima un anonimo poteva inserire in rubrica una riga con QUALSIASI
--    contenuto: anche fingendola un cliente inserito a mano da te
--    (source diverso da 'sito'), o gia' nel cestino, o con una data di
--    richiamo inventata. Non era una fuga di dati - leggere resta
--    impossibile senza login - ma era spazio per sporcare la rubrica.
--
--    Ora l'unica scrittura anonima ammessa e' quella che fanno davvero i
--    moduli del sito: una richiesta nuova, marcata come arrivata dal
--    sito, non gia' cestinata e senza promemoria preimpostati.
--    (index.html e valutazione.html inviano gia' esattamente questo.)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "buyers_public_insert" ON public.buyers;
CREATE POLICY "buyers_public_insert"
  ON public.buyers
  FOR INSERT
  TO anon
  WITH CHECK (
    source = 'sito'
    AND deleted_at IS NULL
    AND next_action_date IS NULL
    AND last_contact_at IS NULL
  );


-- ---------------------------------------------------------------------
-- 6) VERIFICA (facoltativa, da lanciare a mano)
--    Deve rispondere con un array vuoto: la rubrica non e' leggibile
--    senza login, nemmeno adesso che contiene le email.
--
--      curl "<SUPABASE_URL>/rest/v1/buyers?select=full_name,email" \
--        -H "apikey: <SUPABASE_ANON_KEY>"
-- ---------------------------------------------------------------------
