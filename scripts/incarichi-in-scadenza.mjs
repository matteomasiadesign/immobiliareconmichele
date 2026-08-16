/*
 * Incarichi in scadenza: promemoria settimanale.
 *
 * La scheda "In scadenza · 90 gg" della Panoramica esiste gia', ma la si
 * vede solo aprendo il gestionale: un incarico scade anche nelle settimane
 * in cui non lo si apre. Questo script gira su GitHub Actions una volta a
 * settimana e prepara il testo dell'avviso.
 *
 * COSA ESCE DA QUI (e cosa no)
 * Nell'email finiscono solo il titolo dell'annuncio - che e' gia' pubblico,
 * e' l'intestazione che si legge sul sito - e i giorni che mancano.
 * NON escono nomi dei proprietari, telefoni, prezzi, provvigioni ne' alcun
 * dato della rubrica clienti: quelli restano leggibili solo dentro
 * admin.html, dopo il login. Se serve sapere di piu' si apre il gestionale.
 *
 * VARIABILI D'AMBIENTE
 *   SUPABASE_URL               URL del progetto
 *   SUPABASE_SERVICE_ROLE_KEY  chiave di servizio (legge oltre le RLS)
 *
 * Scrive su stdout un riepilogo leggibile e, se e' impostato GITHUB_OUTPUT,
 * ci mette "count" e "body" per lo step successivo del workflow.
 */

import { appendFileSync } from 'node:fs';

const URL_BASE = process.env.SUPABASE_URL;
const CHIAVE   = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Quanto in anticipo avvisare. La Panoramica usa 90 giorni perche' li' e'
// una panoramica; per un avviso settimanale 30 e' la finestra in cui si fa
// davvero qualcosa, altrimenti arriverebbe la stessa email per tre mesi.
const GIORNI_AVVISO = 30;

const MESI_DURATA = { '6 mesi': 6, '1 anno': 12, '2 anni': 24 };

function giorniAllaScadenza(t) {
    const acq = new Date(t.acquisition_date);
    acq.setHours(0, 0, 0, 0);
    const scadenza = new Date(acq);
    scadenza.setMonth(scadenza.getMonth() + (MESI_DURATA[t.assignment_duration] ?? 6));
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    return Math.ceil((scadenza - oggi) / 86400000);
}

function esci(messaggio, codice = 0) {
    console.log(messaggio);
    process.exit(codice);
}

if (!URL_BASE || !CHIAVE) {
    // Senza credenziali non e' un errore: e' un promemoria non ancora
    // configurato. Il workflow lo salta senza colorare di rosso la Action.
    esci('Segreti Supabase non impostati: promemoria saltato. Vedi scripts/README.md');
}

// Si chiedono solo le colonne che servono. Anche se la chiave di servizio
// potrebbe leggere tutto, quello che non si chiede non puo' finire per
// sbaglio dentro un'email.
const query = new URLSearchParams({
    select: 'id,property_title,acquisition_date,assignment_duration,status',
    status: 'eq.In Vendita',
    deleted_at: 'is.null'
});

const risposta = await fetch(`${URL_BASE}/rest/v1/transactions?${query}`, {
    headers: { apikey: CHIAVE, Authorization: `Bearer ${CHIAVE}` }
});

if (!risposta.ok) {
    console.error(`Supabase ha risposto ${risposta.status}: ${await risposta.text()}`);
    process.exit(1);
}

const incarichi = await risposta.json();

const inScadenza = incarichi
    .map(t => ({ titolo: t.property_title || 'Incarico senza titolo', giorni: giorniAllaScadenza(t) }))
    .filter(x => x.giorni <= GIORNI_AVVISO)
    .sort((a, b) => a.giorni - b.giorni);

if (inScadenza.length === 0) {
    esci(`Nessun incarico scade entro ${GIORNI_AVVISO} giorni. Nessuna email da mandare.`);
}

const descriviScadenza = x =>
    x.giorni < 0  ? `scaduto da ${Math.abs(x.giorni)} giorni`
  : x.giorni === 0 ? 'scade oggi'
  : x.giorni === 1 ? 'scade domani'
  : `scade tra ${x.giorni} giorni`;

const righe = inScadenza.map(x => `• ${x.titolo} — ${descriviScadenza(x)}`);
const titolo = inScadenza.length === 1
    ? '1 incarico da rinnovare'
    : `${inScadenza.length} incarichi da rinnovare`;

const corpo = [
    titolo,
    '',
    ...righe,
    '',
    'Apri il gestionale per i dettagli: https://immobiliareconmichele.it/admin.html',
    '',
    '(Promemoria automatico settimanale. Qui compaiono solo i titoli degli',
    'annunci: nomi, contatti e importi restano dentro al gestionale.)'
].join('\n');

console.log(corpo);

if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, [
        `count=${inScadenza.length}`,
        `subject=${titolo}`,
        'body<<FINE_CORPO',
        corpo,
        'FINE_CORPO',
        ''
    ].join('\n'));
}
