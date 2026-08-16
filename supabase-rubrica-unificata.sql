-- =====================================================================
-- Rubrica unificata (agosto 2026)
--
-- IL PROBLEMA
-- In rubrica finiva solo chi compilava un modulo sul sito, cioe' il
-- contatto meno impegnato che esista. NON ci finivano:
--   - il proprietario che ha firmato un incarico
--   - il proponente che ha fatto un'offerta scritta
-- eppure di quelle persone incarico.html e proposta.html raccolgono nome,
-- cellulare, telefono, email e domicilio. Tutto finiva dentro
-- documenti_bozze.dati come blob JSON e non arrivava da nessuna parte.
--
-- Conseguenza concreta: l'elenco "Da fare" diceva "incarico scaduto da 42
-- giorni, da rinnovare" mostrando il nome del proprietario, ma non c'era
-- modo di chiamarlo: transactions.owner_name e' testo libero senza recapiti.
--
-- COSA FA QUESTO FILE
-- 1) "buyers" impara il RUOLO: acquirente, venditore o entrambi. Prima la
--    tabella sapeva rappresentare solo chi compra ("In Ricerca", "Ha
--    comprato"), mentre chi ti vende casa oggi e' chi te ne compra un'altra
--    fra due anni.
-- 2) "transactions" prende owner_id: l'incarico smette di ricordare il
--    proprietario come stringa e punta a una persona vera, con il suo
--    numero. owner_name resta per gli incarichi storici e per quelli
--    scritti a mano.
-- 3) Un indice sul telefono, che diventa la chiave con cui si riconosce
--    una persona gia' presente invece di duplicarla.
--
-- SULLA PRIVACY
-- In rubrica vanno nome, telefono ed email. Codice fiscale, documento e
-- data di nascita NON vengono copiati: servono all'atto e nell'atto
-- restano. Duplicarli in una seconda tabella allargherebbe la superficie
-- di esposizione senza servire a niente per un'agenda di contatti.
-- Le colonne nuove ereditano "buyers_auth_all": la rubrica resta
-- leggibile solo dopo il login.
--
-- COME APPLICARLA
-- Supabase -> SQL Editor -> incolla -> Run. Idempotente.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) BUYERS: il ruolo.
--    Le righe gia' presenti diventano 'acquirente': vengono tutte da
--    moduli o inserimenti pensati per chi cerca casa, quindi e' il valore
--    storicamente corretto.
-- ---------------------------------------------------------------------
ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS ruolo text NOT NULL DEFAULT 'acquirente';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'buyers_ruolo_valido'
  ) THEN
    ALTER TABLE public.buyers
      ADD CONSTRAINT buyers_ruolo_valido
      CHECK (ruolo IN ('acquirente', 'venditore', 'entrambi'));
  END IF;
END $$;


-- ---------------------------------------------------------------------
-- 2) Il telefono e' la chiave con cui si riconosce chi c'e' gia'.
--    Non e' UNIQUE apposta: due conviventi possono condividere un fisso,
--    e un vincolo rigido farebbe fallire il salvataggio di un documento
--    invece di limitarsi a creare due schede.
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS buyers_phone_idx ON public.buyers(phone) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS buyers_email_idx ON public.buyers(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS buyers_ruolo_idx ON public.buyers(ruolo) WHERE deleted_at IS NULL;


-- ---------------------------------------------------------------------
-- 3) TRANSACTIONS: il proprietario diventa una persona, non una stringa.
--    ON DELETE SET NULL: se la scheda del proprietario sparisce,
--    l'incarico resta con il suo owner_name di scorta.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  buyer_id_type text;
BEGIN
  SELECT data_type INTO buyer_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'buyers' AND column_name = 'id';

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'owner_id'
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.transactions ADD COLUMN owner_id %s REFERENCES public.buyers(id) ON DELETE SET NULL',
      buyer_id_type
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS transactions_owner_id_idx ON public.transactions(owner_id);


-- ---------------------------------------------------------------------
-- 4) VERIFICA (facoltativa)
--    Deve restare vuoto: la rubrica non e' leggibile senza login,
--    nemmeno adesso che contiene anche i proprietari.
--
--      curl "<SUPABASE_URL>/rest/v1/buyers?select=full_name,phone,ruolo" \
--        -H "apikey: <SUPABASE_ANON_KEY>"
-- ---------------------------------------------------------------------
