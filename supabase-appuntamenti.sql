-- =====================================================================
-- Agenda appuntamenti (agosto 2026)
--
-- IL PROBLEMA
-- Il gestionale sapeva dire cosa era GIA' successo (incarichi, vendite,
-- fatturato) e cosa era in ritardo ("Da fare"), ma non sapeva niente di
-- quello che deve ancora succedere a una data precisa. Un atto fissato
-- per giovedi', una perizia, tre visite di sabato mattina: tutta roba che
-- viveva fuori dal gestionale, sul telefono o su un foglio.
--
-- Mancava soprattutto un collegamento: le visite a un immobile. Sapevi
-- da quanto tempo un annuncio era online, ma non quante persone lo
-- avevano davvero visto. Sono due informazioni molto diverse quando devi
-- decidere se ritoccare un prezzo o richiamare il proprietario.
--
-- COSA FA QUESTO FILE
-- Crea la tabella "appuntamenti" e la collega a immobili e rubrica.
--
-- DUE SCELTE CHE VALE LA PENA SPIEGARE
--
-- 1) "svolto_at" e' un ISTANTE, non un flag booleano.
--    Un booleano sa dire che l'appuntamento e' stato fatto; un timestamp
--    sa dire anche quando lo hai spuntato. E' la stessa ragione per cui
--    "buyers" ha last_contact_at e non un "gia_sentito" vero/falso.
--
-- 2) Il COLORE del tipo non sta qui dentro.
--    Vive in admin.html, nella costante TIPI_APPUNTAMENTO. Se stesse in
--    tabella, cambiare la palette o il tema scuro vorrebbe dire fare una
--    migrazione del database per una questione puramente grafica.
--
-- E UNA CHE VALE PER I DATI
-- Un appuntamento svolto NON viene cancellato: diventa grigio nel
-- calendario. E' esattamente lo storico che serve per contare quante
-- visite ha ricevuto un immobile - se le righe sparissero una volta
-- spuntate, il conteggio si azzererebbe da solo ogni settimana.
--
-- SULLA PRIVACY
-- L'agenda dice dove sarai, quando e con chi: dopo la rubrica e' il dato
-- piu' sensibile del gestionale. Nessun accesso anonimo, in nessuna
-- forma - nemmeno in inserimento. A differenza di "buyers", che accetta
-- le richieste dei moduli pubblici, qui non c'e' nessuna pagina del sito
-- che debba scrivere: l'unica sorgente e' admin.html dopo il login.
--
-- COME APPLICARLA
-- Dashboard Supabase del progetto -> SQL Editor -> incolla tutto questo
-- file -> Run. E' idempotente: si puo' rieseguire senza problemi.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) LA TABELLA
--
--    "fine" e' facoltativa: una chiamata da fare non ha una durata, un
--    atto dal notaio si'. "tutto_il_giorno" serve alla giornata di foto
--    e video, che occupa la mattina senza avere un orario di inizio che
--    abbia senso scrivere.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appuntamenti (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            text NOT NULL DEFAULT 'visita',
  titolo          text,
  inizio          timestamptz NOT NULL,
  fine            timestamptz,
  tutto_il_giorno boolean NOT NULL DEFAULT false,
  luogo           text,
  note            text,
  svolto_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);


-- Il titolo e' NULL quando non gliene hai dato uno, ed e' il caso
-- normale: il tipo lo dice gia' il colore nel calendario, l'immobile e il
-- cliente sono due colonne qui sotto. "Visita Via Roma 12" con tipo
-- 'visita' e property_id di Via Roma 12 e' la stessa cosa scritta tre
-- volte. Il nome da mostrare lo costruisce admin.html al momento di
-- disegnare (etichettaAppuntamento), cosi' se rinomini un immobile
-- cambia anche negli appuntamenti gia' passati.
--
-- Se hai gia' eseguito una versione precedente di questo file la colonna
-- e' NOT NULL: la riga qui sotto la libera. E' sicura da rieseguire.
ALTER TABLE public.appuntamenti ALTER COLUMN titolo DROP NOT NULL;


-- ---------------------------------------------------------------------
-- 2) I TIPI AMMESSI
--
--    Il vincolo e' scritto con DROP + ADD invece che dentro la CREATE
--    TABLE apposta: aggiungere un tipo domani (per dire 'firma' o
--    'banca') vuol dire aggiungere una parola a questo elenco e
--    rieseguire il file, senza dover ricreare niente.
--    Ricordati che il tipo nuovo va aggiunto anche a TIPI_APPUNTAMENTO
--    in admin.html, altrimenti resta senza colore ne' etichetta.
-- ---------------------------------------------------------------------
ALTER TABLE public.appuntamenti DROP CONSTRAINT IF EXISTS appuntamenti_tipo_valido;
ALTER TABLE public.appuntamenti
  ADD CONSTRAINT appuntamenti_tipo_valido
  CHECK (tipo IN ('atto', 'perizia', 'visita', 'valutazione', 'contenuti', 'chiamata', 'altro'));


-- ---------------------------------------------------------------------
-- 3) I COLLEGAMENTI a immobile e cliente.
--
--    Il tipo di properties.id / buyers.id viene rilevato dallo schema
--    invece di darlo per scontato (bigint o uuid a seconda di come e'
--    nata la tabella), come gia' fatto in supabase-crm-upgrade.sql.
--
--    ON DELETE SET NULL e non CASCADE: se un immobile viene eliminato
--    davvero, le visite che ha ricevuto restano in agenda come storico.
--    Cancellare un annuncio non deve riscrivere il passato.
--
--    Il cliente serve quanto l'immobile: senza buyer_id l'agenda sa
--    dirti che l'immobile ha avuto sette visite, ma non chi richiamare
--    per sapere com'e' andata.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  prop_id_type  text;
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
    WHERE table_schema = 'public' AND table_name = 'appuntamenti' AND column_name = 'property_id'
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.appuntamenti ADD COLUMN property_id %s REFERENCES public.properties(id) ON DELETE SET NULL',
      prop_id_type
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appuntamenti' AND column_name = 'buyer_id'
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.appuntamenti ADD COLUMN buyer_id %s REFERENCES public.buyers(id) ON DELETE SET NULL',
      buyer_id_type
    );
  END IF;
END $$;


-- ---------------------------------------------------------------------
-- 4) INDICI
--
--    Il calendario carica sempre per intervallo di date e la Panoramica
--    chiede "i prossimi sette giorni" a ogni accesso: senza l'indice su
--    "inizio" ogni apertura del gestionale diventa una scansione
--    completa. Gli altri due servono ai conteggi per immobile e per
--    cliente, che girano dentro il render di ogni scheda.
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS appuntamenti_inizio_idx      ON public.appuntamenti(inizio)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS appuntamenti_property_id_idx ON public.appuntamenti(property_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS appuntamenti_buyer_id_idx    ON public.appuntamenti(buyer_id)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS appuntamenti_svolto_at_idx   ON public.appuntamenti(svolto_at)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS appuntamenti_deleted_at_idx  ON public.appuntamenti(deleted_at);


-- ---------------------------------------------------------------------
-- 5) SICUREZZA: solo dopo il login, punto.
--
--    Nessuna policy per "anon", nemmeno in INSERT. Se un domani nascesse
--    una pagina pubblica in cui il cliente prenota da solo una visita,
--    NON andra' aggiunta qui una policy permissiva: quella richiesta
--    dovra' entrare da "buyers" come tutte le altre e diventare un
--    appuntamento solo dopo che l'hai confermata tu.
-- ---------------------------------------------------------------------
ALTER TABLE public.appuntamenti ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appuntamenti_auth_all" ON public.appuntamenti;
CREATE POLICY "appuntamenti_auth_all"
  ON public.appuntamenti
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ---------------------------------------------------------------------
-- 6) VERIFICA (facoltativa)
--    Deve rispondere con un array vuoto: la tua agenda non e' leggibile
--    da chi non ha fatto login, nemmeno conoscendo la chiave pubblica.
--
--      curl "<SUPABASE_URL>/rest/v1/appuntamenti?select=titolo,inizio" \
--        -H "apikey: <SUPABASE_ANON_KEY>"
-- ---------------------------------------------------------------------
