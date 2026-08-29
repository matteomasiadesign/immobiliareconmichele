-- =====================================================================
-- SCRIPT DI PULIZIA: INCARICHI E DOCUMENTI FITTIZI / AUTO-GENERATI
--
-- Questo script rimuove ESCLUSIVAMENTE:
-- 1. I 33 incarichi placeholder creati in automatico dalla vecchia
--    sincronizzazione per tutti gli immobili (senza proprietario, con
--    provvigioni 0% e collegati a immobili senza incarico firmato).
-- 2. I documenti e contatti di prova generati dal tasto di esempio
--    ("Anna Piras", "Marco Rossini").
--
-- NON tocca alcuna vendita reale ('Venduto'), nessun incarico con
-- proprietario/provvigioni, né i tuoi veri annunci o clienti.
-- =====================================================================

-- 1. RIMOZIONE INCARICHI PLACEHOLDER AUTO-GENERATI IN `transactions`
DELETE FROM public.transactions
WHERE 
  -- Solo se NON è una vendita conclusa (preserva tutte le vendite storiche reali)
  status != 'Venduto'
  AND sale_date IS NULL
  AND final_price IS NULL
  -- Solo se non ha alcun proprietario inserito
  AND (owner_name IS NULL OR TRIM(owner_name) = '')
  -- Solo se ha entrambe le provvigioni a 0 (tipico dei placeholder automatici)
  AND (COALESCE(commission_seller_perc, 0) = 0)
  AND (COALESCE(commission_buyer_perc, 0) = 0)
  -- Solo se collegato a un immobile che NON ha la spunta di incarico firmato
  AND property_id IN (
    SELECT id FROM public.properties WHERE has_mandate = false
  );

-- 2. RIMOZIONE DOCUMENTI DI TEST IN `documenti_bozze` (generati dai dati di esempio)
DELETE FROM public.documenti_bozze
WHERE 
  titolo ILIKE '%Anna Piras%'
  OR titolo ILIKE '%Marco Rossini%'
  OR (dati->>'propNome') ILIKE '%Anna Piras%'
  OR (dati->>'proponenteNome') ILIKE '%Marco Rossini%';

-- 3. RIMOZIONE CONTATTI DI TEST IN RUBRICA `buyers` (generati dai dati di esempio)
DELETE FROM public.buyers
WHERE 
  full_name ILIKE '%Anna Piras%'
  OR full_name ILIKE '%Marco Rossini%';

