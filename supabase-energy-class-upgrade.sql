-- ==============================================================================
-- AGGIORNAMENTO SCHEMA: CLASSE ENERGETICA (APE) & INDICE IPE
-- Esegui questo script nell'SQL Editor di Supabase
-- ==============================================================================

-- 1. Aggiunge le colonne per la classe energetica e l'indice IPE alla tabella properties
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS energy_class TEXT DEFAULT 'In fase di definizione',
ADD COLUMN IF NOT EXISTS energy_performance TEXT DEFAULT NULL;

-- 2. Ricrea in modo pulito la view pubblica con tutte le colonne
DROP VIEW IF EXISTS public.properties_public CASCADE;

CREATE VIEW public.properties_public AS
SELECT 
    id,
    title,
    price,
    status,
    zone,
    property_type,
    rooms,
    bathrooms,
    sqm,
    description,
    images,
    reel_url,
    has_parking,
    is_featured,
    is_luxury,
    is_visible,
    energy_class,
    energy_performance,
    created_at
FROM public.properties
WHERE deleted_at IS NULL AND (is_visible IS TRUE OR is_visible IS NULL);

-- 3. Assegna i permessi di lettura sulla view per utenti anonimi e autenticati
GRANT SELECT ON public.properties_public TO anon, authenticated;
