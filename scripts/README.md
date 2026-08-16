# Promemoria incarichi in scadenza

Ogni lunedì mattina una GitHub Action guarda gli incarichi attivi e, se
qualcuno scade entro 30 giorni, manda un'email.

Finché i segreti qui sotto non sono impostati la Action **gira e non fa
niente**, senza andare in errore: si può fare il push tranquillamente e
configurarla con calma.

## I segreti da aggiungere

Repository → Settings → Secrets and variables → Actions → *New repository secret*.

| Segreto | Dove si trova |
|---|---|
| `SUPABASE_URL` | già presente (lo usa `keep-alive.yml`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` |
| `MAIL_USERNAME` | l'indirizzo Gmail da cui parte l'email |
| `MAIL_PASSWORD` | *password per le app* di quell'account Gmail (non la password normale) |
| `NOTIFY_EMAIL` | l'indirizzo a cui arriva l'avviso |

La password per le app si crea da
[myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
e richiede la verifica in due passaggi attiva. La password normale di Gmail
non funziona: Google la rifiuta per l'SMTP.

## Perché serve la chiave `service_role`

La tabella `transactions` non è leggibile in modo anonimo (vedi
`supabase-rls-policies.sql`), ed è giusto così: contiene prezzi di chiusura
e provvigioni. Un lavoro che gira su un server, senza nessuno che abbia
fatto login, ha bisogno della chiave di servizio per leggerla.

Quella chiave scavalca le RLS, quindi va tenuta **solo** nei segreti di
GitHub: non deve finire in nessun file del sito, dove sarebbe leggibile da
chiunque apra il codice sorgente della pagina.

## Cosa esce dal gestionale

Nell'email ci sono soltanto il **titolo dell'annuncio** — che è già pubblico,
è quello che si legge sul sito — e i giorni che mancano alla scadenza.

Non escono nomi dei proprietari, telefoni, prezzi, provvigioni, né alcun dato
della rubrica clienti. Per quelli si apre il gestionale e si fa il login,
che resta l'unico posto dove si vedono.

## Provarla subito

Actions → *Promemoria incarichi in scadenza* → **Run workflow**. Il log dello
step "Cerca gli incarichi in scadenza" mostra esattamente il testo che verrebbe
spedito.
