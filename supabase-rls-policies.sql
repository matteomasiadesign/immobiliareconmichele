-- =====================================================================
-- Policy di sicurezza (Row Level Security) consigliate per il progetto
-- "Immobiliare con Michele".
--
-- PERCHE' SERVE
-- Tutte le pagine del sito (pubbliche e admin) usano la stessa chiave
-- pubblica "anon" di Supabase, incorporata nel codice HTML che chiunque
-- puo' leggere. Senza RLS attiva e senza policy corrette, chiunque
-- conosca quella chiave puo' interrogare direttamente l'API REST di
-- Supabase (senza passare dal sito) e leggere o modificare qualsiasi
-- riga di qualsiasi tabella, comprese le tabelle "transactions" e
-- "buyers" che contengono dati personali di clienti e proprietari.
--
-- COME APPLICARLA
-- 0) IMPORTANTE: esegui prima supabase-immobili-incarichi-upgrade.sql
--    (crea la vista "properties_public" che il sito pubblico usa). Se lo
--    fai dopo questo file, index.html/catalogo.html smettono di mostrare
--    annunci finche' non esegui anche quello.
-- 1) Apri la dashboard Supabase del progetto -> SQL Editor.
-- 2) Incolla l'intero contenuto di questo file ed esegui (Run).
-- 3) Verifica poi che tutto funzioni ancora: apri index.html/catalogo.html
--    (devono continuare a mostrare gli annunci) e admin.html (login e
--    gestione annunci/incarichi/clienti devono continuare a funzionare).
-- 4) Verifica che l'accesso non autorizzato sia bloccato, ad es.:
--      curl "<SUPABASE_URL>/rest/v1/buyers?select=*" \
--        -H "apikey: <SUPABASE_ANON_KEY>"
--    Prima di questo script risponde con i dati dei clienti; dopo deve
--    rispondere con un array vuoto [] (nessuna riga leggibile da anonimo).
--
-- NOTE
-- - "properties" NON e' piu' leggibile in modo anonimo: contiene anche le
--   date di acquisizione/scadenza riservate al gestionale. Il sito
--   pubblico legge invece dalla vista "properties_public" (creata da
--   supabase-immobili-incarichi-upgrade.sql), che espone solo gli
--   annunci con is_visible = true e nessuna colonna riservata.
--   "properties" resta scrivibile solo da utenti autenticati (il
--   pannello admin).
-- - "transactions" NON e' leggibile ne' scrivibile in modo anonimo: solo
--   un utente autenticato (chi ha fatto login in admin.html) puo'
--   leggerla e modificarla.
-- - "buyers" segue la stessa regola, con UNA eccezione: chiunque puo'
--   INSERIRE una nuova riga (il modulo "Contatti" del sito la usa per
--   registrare le richieste), ma nessuno puo' leggere/modificare/
--   cancellare le righe esistenti senza essere autenticato.
-- - Il bucket storage "properties-images" resta leggibile pubblicamente
--   (le foto devono essere visibili sul sito) ma caricabile/cancellabile
--   solo da utenti autenticati.
--
-- SE HAI GIA' ESEGUITO QUESTO FILE IN PRECEDENZA: e' stata aggiunta solo
-- la policy "buyers_public_insert" (sezione 3). Puoi rieseguire l'intero
-- file senza problemi (ogni policy viene ricreata da zero con DROP+CREATE),
-- oppure incollare ed eseguire solo il blocco della sezione 3.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) PROPERTIES: lettura solo autenticati (il sito pubblico legge dalla
--    vista "properties_public", non da questa tabella), scrittura solo
--    autenticati.
-- ---------------------------------------------------------------------
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "properties_public_read" ON public.properties;
CREATE POLICY "properties_auth_read"
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "properties_auth_insert" ON public.properties;
CREATE POLICY "properties_auth_insert"
  ON public.properties
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "properties_auth_update" ON public.properties;
CREATE POLICY "properties_auth_update"
  ON public.properties
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "properties_auth_delete" ON public.properties;
CREATE POLICY "properties_auth_delete"
  ON public.properties
  FOR DELETE
  TO authenticated
  USING (true);


-- ---------------------------------------------------------------------
-- 2) TRANSACTIONS (incarichi/CRM): solo utenti autenticati, in lettura
--    e scrittura. Nessun accesso anonimo.
-- ---------------------------------------------------------------------
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_auth_all" ON public.transactions;
CREATE POLICY "transactions_auth_all"
  ON public.transactions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ---------------------------------------------------------------------
-- 3) BUYERS (rubrica clienti): lettura/modifica/cancellazione solo per
--    utenti autenticati. Fa eccezione l'INSERT pubblico, che serve al
--    modulo "Contatti" del sito (index.html) per inviare una nuova
--    richiesta: un visitatore puo' CREARE una riga (la sua richiesta),
--    ma non puo' leggere, modificare o cancellare i clienti gia'
--    presenti in rubrica - quelli restano visibili solo a te via login.
-- ---------------------------------------------------------------------
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyers_auth_all" ON public.buyers;
CREATE POLICY "buyers_auth_all"
  ON public.buyers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "buyers_public_insert" ON public.buyers;
CREATE POLICY "buyers_public_insert"
  ON public.buyers
  FOR INSERT
  TO anon
  WITH CHECK (true);


-- ---------------------------------------------------------------------
-- 4) STORAGE "properties-images": lettura pubblica (le foto devono
--    essere visibili sul sito), scrittura/cancellazione solo autenticati.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "properties_images_public_read" ON storage.objects;
CREATE POLICY "properties_images_public_read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'properties-images');

DROP POLICY IF EXISTS "properties_images_auth_insert" ON storage.objects;
CREATE POLICY "properties_images_auth_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'properties-images');

DROP POLICY IF EXISTS "properties_images_auth_update" ON storage.objects;
CREATE POLICY "properties_images_auth_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'properties-images')
  WITH CHECK (bucket_id = 'properties-images');

DROP POLICY IF EXISTS "properties_images_auth_delete" ON storage.objects;
CREATE POLICY "properties_images_auth_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'properties-images');
