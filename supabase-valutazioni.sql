-- =====================================================================
-- Aggiunge il tipo di richiesta alla tabella buyers, per distinguere
-- nel gestionale una richiesta di valutazione gratuita (valutazione.html)
-- da un contatto generico del modulo "Contatti" (index.html).
--
-- COME APPLICARLA
-- Supabase -> SQL Editor -> incolla ed esegui questo file.
-- Sicuro da rieseguire piu' volte (usa IF NOT EXISTS).
--
-- Non serve toccare le policy RLS: quelle gia' presenti (vedi
-- supabase-rls-policies.sql) si applicano automaticamente anche alla
-- nuova colonna, perche' la sicurezza in Supabase e' per riga, non
-- per singola colonna. Il modulo pubblico continua quindi a poter
-- inserire (e solo inserire) le sue richieste.
-- =====================================================================

ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'contatto';

-- I contatti gia' in rubrica restano 'contatto': in admin.html il badge
-- "Valutazione" comparira' quindi solo sulle richieste nuove che arrivano
-- davvero dalla pagina /valutazione, senza rietichettare lo storico.
--
-- Zona e tipologia dell'immobile da valutare riusano le colonne gia'
-- esistenti desired_zone / desired_type, cosi' compaiono subito nella
-- colonna "Tipologia (Zona)" della rubrica senza altre modifiche allo
-- schema; le caratteristiche selezionate finiscono in "notes".
