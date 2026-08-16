-- =====================================================================
-- Correzione: "properties" era leggibile da chiunque (agosto 2026)
--
-- IL PROBLEMA
-- Con la sola chiave pubblica, quella che sta nel sorgente di ogni pagina,
-- un estraneo poteva leggere la tabella "properties" per intero:
--
--   curl ".../rest/v1/properties?select=title,is_visible,acquisition_date" \
--     -H "apikey: sb_publishable_..."
--   -> [{"title":"Villa con parco","is_visible":true,...}]
--
-- Oggi non trapela nulla di grave, perche' tutti gli annunci sono visibili
-- sul sito e le date di acquisizione sono vuote. Ma "properties" contiene
-- anche acquisition_date, expiry_date, is_visible e (da questo aggiornamento)
-- deleted_at: sono dati del gestionale. Appena si compila una scadenza o si
-- nasconde un annuncio, quella roba diventa leggibile da fuori.
--
-- PERCHE' supabase-rls-policies.sql NON BASTAVA
-- Quel file elimina la policy chiamandola per nome ("properties_public_read").
-- Se sul database la policy permissiva si chiama in un altro modo - e a
-- giudicare da com'e' andata si chiama in un altro modo - il DROP non la
-- trova e non cambia niente. Qui invece si cancellano TUTTE le policy di
-- "properties", quale che sia il loro nome, e si ricreano le quattro giuste.
--
-- IL SITO PUBBLICO NON SI ROMPE
-- index.html e catalogo.html non leggono questa tabella: leggono la vista
-- "properties_public", che gira con i permessi del proprietario e quindi
-- continua a funzionare. Cambia solo l'accesso diretto alla tabella.
--
-- COME APPLICARLA
-- Supabase -> SQL Editor -> incolla -> Run. Si puo' rieseguire.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) Prima di toccare niente: cosa c'e' adesso.
--    Il risultato compare nel riquadro in basso dell'SQL Editor. Se fra
--    i "roles" compare {anon}, quella riga e' la porta aperta.
-- ---------------------------------------------------------------------
SELECT policyname, cmd, roles, qual::text AS condizione
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'properties'
ORDER BY policyname;


-- ---------------------------------------------------------------------
-- 2) Via tutte le policy esistenti su "properties", senza doverne
--    indovinare il nome.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'properties'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.properties', p.policyname);
    RAISE NOTICE 'Rimossa la policy %', p.policyname;
  END LOOP;
END $$;


-- ---------------------------------------------------------------------
-- 3) RLS accesa e quattro policy per soli utenti autenticati.
--    Senza ENABLE le policy non vengono nemmeno consultate: e' il passo
--    che con ogni probabilita' non era mai stato eseguito.
-- ---------------------------------------------------------------------
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_auth_read"
  ON public.properties FOR SELECT TO authenticated USING (true);

CREATE POLICY "properties_auth_insert"
  ON public.properties FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "properties_auth_update"
  ON public.properties FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "properties_auth_delete"
  ON public.properties FOR DELETE TO authenticated USING (true);


-- ---------------------------------------------------------------------
-- 4) Com'e' rimasta la situazione: devono comparire quattro righe, tutte
--    con roles = {authenticated} e nessuna con {anon} o {public}.
-- ---------------------------------------------------------------------
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'properties'
ORDER BY policyname;


-- ---------------------------------------------------------------------
-- 5) LA PROVA VERA, da fare fuori da qui (Terminale/Prompt dei comandi).
--    La prima deve rispondere [] , la seconda deve continuare a
--    rispondere con gli annunci del sito.
--
--    curl "https://svdfgejkjvkbajmqoqjz.supabase.co/rest/v1/properties?select=title" \
--      -H "apikey: sb_publishable_aGoAYeXnUtVMe4bIc20wIQ_2EM4LTSG"
--
--    curl "https://svdfgejkjvkbajmqoqjz.supabase.co/rest/v1/properties_public?select=title" \
--      -H "apikey: sb_publishable_aGoAYeXnUtVMe4bIc20wIQ_2EM4LTSG"
-- ---------------------------------------------------------------------
