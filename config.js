/*
 * Coordinate del progetto Supabase, in un punto solo.
 *
 * Erano ripetute in quattro file (shared.js, admin.html, incarico.html,
 * proposta.html): cambiando progetto se ne dimenticava sempre uno. Va incluso
 * PRIMA di ogni altro script che parli con il database.
 *
 * La chiave e' "publishable" (sb_publishable_...), cioe' pensata per stare nel
 * codice del browser: da sola non da' accesso a nulla. A proteggere i dati sono
 * le policy RLS del database - vedi supabase-rls-policies.sql. Qui non va mai
 * messa la chiave "secret"/service_role.
 */

const SUPABASE_URL = "https://svdfgejkjvkbajmqoqjz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_aGoAYeXnUtVMe4bIc20wIQ_2EM4LTSG";
