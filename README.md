# Immobiliare con Michele

Sito e gestionale di Michele Erre, agente immobiliare a Porto Torres.

È un sito **statico**: nessuna build, nessun `npm install`. Si apre `index.html`
in un browser (o si serve la cartella) e funziona. I dati stanno su
[Supabase](https://supabase.com); le pagine ci parlano direttamente via la
libreria ufficiale caricata da CDN.

## Le pagine

| File | A cosa serve | Accesso |
|---|---|---|
| `index.html` | Vetrina: hero, immobili in evidenza, contatti | pubblico |
| `catalogo.html` | Tutti gli annunci, con filtri | pubblico |
| `valutazione.html` | Modulo richiesta valutazione gratuita | pubblico |
| `admin.html` | Gestionale: annunci, contatti, statistiche, bozze | login |
| `incarico.html` | Incarico di mediazione → PDF | login |
| `proposta.html` | Proposta d'acquisto → PDF | login |

## I file condivisi

Le pagine sono raggruppate per famiglia, e ogni famiglia ha i suoi due file
comuni. Chi modifica una pagina dovrebbe chiedersi prima se la modifica vale
anche per la gemella: in quel caso va nel file condiviso, non duplicata.

| File | Usato da | Contiene |
|---|---|---|
| `config.js` | tutte | URL e chiave pubblica Supabase — **il solo posto in cui stanno** |
| `shared.css` / `shared.js` | index, catalogo, valutazione | navbar, menu mobile, FAB, card annuncio, modale, animazioni |
| `documenti.css` / `documenti.js` | incarico, proposta | stile del modulo e salvataggio bozze |
| `pdf-helpers.js` | incarico, proposta | `creaPdfKit()`: intestazione, sezioni, firme del PDF |

> **Attenzione a incarico e proposta.** Sono atti con un testo giuridicamente
> preciso. I file condivisi coprono solo l'aspetto e il salvataggio: i campi
> del modulo e la funzione `generaPDF()` di ciascuna pagina non vanno
> riformulati senza una ragione esplicita.

## Librerie esterne

GSAP, ScrollTrigger e Lenis sono copiati nel repo (`gsap.min.js`,
`scrolltrigger.min.js`, `lenis.min.js`). Supabase, jsPDF, html2canvas,
Sortable e Chart.js arrivano da CDN, **con la versione fissata**: senza numero
di versione un aggiornamento della libreria può rompere il sito senza che sia
stata toccata una riga qui.

## Database

Gli script SQL vanno eseguiti da **Supabase → SQL Editor**, in quest'ordine.
Sono scritti per essere sicuri da rieseguire (`IF NOT EXISTS`).

1. `supabase-rls-policies.sql` — Row Level Security. **Il più importante**: la
   chiave nel codice è pubblica e leggibile da chiunque, sono queste policy a
   impedire che un estraneo scriva sul database. Da applicare per primo.
2. `supabase-immobili-incarichi-upgrade.sql` — campi del gestionale su `properties`
3. `supabase-documenti-bozze.sql` — tabella `documenti_bozze` (incarichi e proposte salvati)
4. `supabase-buyers-source-tracking.sql` — origine dei contatti e messaggi da leggere
5. `supabase-valutazioni.sql` — distingue le richieste di valutazione dai contatti generici
6. `supabase-fix-properties-rls.sql` — correzione: `properties` risultava
   leggibile da chiunque avesse la chiave pubblica. Cancella **tutte** le policy
   della tabella senza doverne indovinare il nome e ricrea solo quelle per
   utenti autenticati. Il sito pubblico non se ne accorge: legge dalla vista
   `properties_public`, non dalla tabella.
7. `supabase-crm-upgrade.sql` — email e promemoria di richiamo sulla rubrica,
   collegamento dei documenti a immobile e cliente, colonna `deleted_at` per il
   cestino. Stringe anche l'unico permesso pubblico su `buyers`: da fuori si può
   solo inserire una richiesta marcata `source='sito'`.

Il workflow `.github/workflows/keep-alive.yml` interroga il database ogni tre
giorni: i progetti Supabase gratuiti vengono sospesi dopo un periodo di
inattività, e questo lo tiene sveglio. Usa i secret `SUPABASE_URL` e
`SUPABASE_ANON_KEY` del repo GitHub — se cambia il progetto vanno aggiornati
lì **oltre** che in `config.js`.

Gli incarichi in scadenza non hanno bisogno di un promemoria esterno: compaiono
nell'elenco "Da fare" della Panoramica, che è la prima cosa che si vede
entrando nel gestionale.

## Immagini e icone

- `logo.svg` — marchio, usato da tutte le pagine e come favicon
- `michele.webp` — ritratto brandizzato, sia nell'hero sia nel riquadro contatti
- `app-icon.svg` — **sorgente** delle icone dell'app, non referenziato dalle pagine
- `og-image.jpg` — anteprima mostrata quando si condivide il link del sito

Da `app-icon.svg` si generano i tre file raster citati in
`manifest.webmanifest` e nel `<head>` delle pagine. Con
[ImageMagick](https://imagemagick.org):

```sh
magick -background none app-icon.svg -resize 192x192 icon-192.png
magick -background none app-icon.svg -resize 512x512 icon-512.png
magick -background none app-icon.svg -resize 180x180 apple-touch-icon.png
```

Se si cambia il marchio vanno rigenerati tutti e tre, altrimenti chi ha già
aggiunto il sito alla schermata home continua a vedere l'icona vecchia.

### L'anteprima social

`og-image.jpg` è ciò che appare quando il link del sito viene incollato in
WhatsApp, Facebook o iMessage. È uno **screenshot della hero vera**, non un
fotomontaggio: `og-image.js` apre `index.html` in Chrome alla misura giusta e
la fotografa a 1200x630. Quando la hero cambia si rigenera così:

```sh
npm install puppeteer-core
node og-image.js
npm uninstall puppeteer-core   # il sito non ne ha bisogno
```

I `<meta property="og:*">` in cima a `index.html` puntano all'immagine con un
URL **assoluto**: i crawler non eseguono JavaScript e parecchi, WhatsApp in
testa, non risolvono i percorsi relativi. Se il sito cambia dominio vanno
aggiornati a mano.

Le anteprime restano in cache dal lato del social, a volte per settimane: dopo
un aggiornamento si forza la rilettura con il
[debugger di Facebook](https://developers.facebook.com/tools/debug/).
