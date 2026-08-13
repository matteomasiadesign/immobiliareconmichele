-- =====================================================================
-- Bozze di Incarichi e Proposte (agosto 2026)
--
-- COSA FA
-- Crea la tabella "documenti_bozze": ogni volta che da incarico.html o
-- proposta.html si clicca "Salva" (o "Esporta PDF", che salva comunque)
-- l'intero contenuto del form viene salvato qui come bozza modificabile,
-- indipendentemente dal fatto che il PDF sia stato generato o meno.
-- Da admin.html (tab "Documenti") si possono poi riaprire, modificare e
-- ri-salvare, oppure eliminare.
--
-- COME APPLICARLA
-- Dashboard Supabase del progetto -> SQL Editor -> incolla tutto questo
-- file -> Run. E' idempotente: si puo' rieseguire senza problemi.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.documenti_bozze (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('incarico', 'proposta')),
  titolo text,
  dati jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documenti_bozze_tipo_idx ON public.documenti_bozze(tipo);
CREATE INDEX IF NOT EXISTS documenti_bozze_updated_at_idx ON public.documenti_bozze(updated_at DESC);

-- Contiene dati personali di clienti/proprietari (CF, indirizzi, importi):
-- nessun accesso anonimo, solo chi ha fatto login su admin.html
-- (stessa regola gia' usata per "transactions" e "buyers").
ALTER TABLE public.documenti_bozze ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documenti_bozze_auth_all" ON public.documenti_bozze;
CREATE POLICY "documenti_bozze_auth_all"
  ON public.documenti_bozze
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
