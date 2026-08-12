-- =====================================================================
-- Aggiunge il tracciamento "richieste dal sito" alla tabella buyers,
-- per distinguere i contatti creati dal modulo pubblico (index.html)
-- da quelli inseriti manualmente in admin.html, e per sapere quali
-- messaggi non sono ancora stati visti da Michele.
--
-- COME APPLICARLA
-- Supabase -> SQL Editor -> incolla ed esegui questo file.
-- Sicuro da rieseguire piu' volte (usa IF NOT EXISTS).
--
-- Non serve toccare le policy RLS: quelle gia' presenti (vedi
-- supabase-rls-policies.sql) si applicano automaticamente anche alle
-- nuove colonne, perche' la sicurezza in Supabase e' per riga, non
-- per singola colonna.
-- =====================================================================

ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manuale';

ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT true;

-- I clienti gia' presenti in rubrica restano "manuale" e "letti" di default,
-- cosi' la nuova sezione "Nuove Richieste dal Sito" in admin.html parte
-- vuota e non mostra improvvisamente vecchi contatti come se fossero nuovi.
