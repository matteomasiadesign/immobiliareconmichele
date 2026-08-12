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
-- - "properties" resta leggibile pubblicamente (serve al sito pubblico),
--   ma scrivibile solo da utenti autenticati (il pannello admin).
-- - "transactions" e "buyers" NON sono leggibili ne' scrivibili in modo
--   anonimo: solo un utente autenticato (chi ha fatto login in admin.html)
--   puo' leggerle e modificarle.
-- - Il bucket storage "properties-images" resta leggibile pubblicamente
--   (le foto devono essere visibili sul sito) ma caricabile/cancellabile
--   solo da utenti autenticati.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) PROPERTIES: lettura pubblica, scrittura solo autenticati
-- ---------------------------------------------------------------------
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "properties_public_read" ON public.properties;
CREATE POLICY "properties_public_read"
  ON public.properties
  FOR SELECT
  TO anon, authenticated
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
-- 3) BUYERS (rubrica clienti): solo utenti autenticati, in lettura
--    e scrittura. Nessun accesso anonimo (dati personali dei clienti).
-- ---------------------------------------------------------------------
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyers_auth_all" ON public.buyers;
CREATE POLICY "buyers_auth_all"
  ON public.buyers
  FOR ALL
  TO authenticated
  USING (true)
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
