/*
 * Gestione delle bozze condivisa tra incarico.html e proposta.html.
 *
 * I due moduli si comportano allo stesso modo: ogni documento compilato viene
 * salvato nella tabella "documenti_bozze" di Supabase - anche quando si genera
 * solo il PDF - cosi' resta riapribile, modificabile ed eliminabile dal tab
 * "Documenti" di admin.html. Riaprendo la pagina con ?id=... si ricarica la
 * bozza corrispondente.
 *
 * Cambiava tra le due pagine solo il valore della colonna "tipo" e il modo di
 * comporre il titolo: tutto il resto era copiato riga per riga. Qui la logica
 * e' scritta una volta e le differenze si passano a initBozze().
 *
 * ATTENZIONE: questo file NON tocca il contenuto del documento. I campi del
 * form, i testi e la generazione del PDF (generaPDF, creaPdfKit) restano nelle
 * rispettive pagine, perche' sono atti con una struttura burocratica precisa.
 */

/* =====================================================================
 * DALLE PERSONE DEL DOCUMENTO ALLA RUBRICA
 *
 * Incarico e proposta chiedono nome, cellulare, telefono ed email di chi
 * firma. Finora quei dati restavano sepolti dentro "dati" e la rubrica non
 * li vedeva: ci finiva solo chi compilava un modulo sul sito, cioe' il
 * contatto meno impegnato, mentre il proprietario che firmava un incarico
 * no. Da qui in poi ogni salvataggio porta quelle persone in rubrica.
 *
 * Non vengono copiati codice fiscale, documento e data di nascita: servono
 * all'atto e nell'atto restano. La rubrica e' un'agenda di contatti, non
 * un secondo archivio di dati identificativi.
 * ===================================================================== */

/**
 * Ultime nove cifre del numero: "349 123 45 67", "+39 3491234567" e
 * "0039 349 1234567" sono la stessa persona, e vanno riconosciute come
 * tale invece di creare tre schede.
 */
function chiaveTelefono(tel) {
    const cifre = (tel || '').replace(/\D/g, '');
    return cifre.length >= 6 ? cifre.slice(-9) : null;
}

const emailNormalizzata = e => (e || '').trim().toLowerCase() || null;

/**
 * Se la persona compare in due documenti con ruoli diversi (ti ha venduto
 * casa e adesso ne compra un'altra) non si sceglie: e' entrambi.
 */
function ruoloUnito(vecchio, nuovo) {
    if (!vecchio || vecchio === nuovo) return nuovo;
    return 'entrambi';
}

/**
 * Inserisce o aggiorna una persona in rubrica e ne restituisce l'id.
 *
 * @returns {Promise<string|null>} id della scheda, o null se non c'era
 *          abbastanza per crearne una.
 */
async function portaInRubrica(supabase, { nome, cell, tel, email, ruolo }) {
    const fullName = (nome || '').trim();
    const telefono = (cell || '').trim() || (tel || '').trim();
    const posta = emailNormalizzata(email);

    // Un nome senza nessun recapito non e' un contatto: e' rumore. Le bozze
    // si salvano anche compilate a meta', e non devono riempire la rubrica
    // di schede su cui non si puo' fare niente.
    if (!fullName || (!telefono && !posta)) return null;

    // La rubrica di un'agenzia sta in poche centinaia di righe: si leggono
    // tutte e si confronta in memoria, perche' i numeri sono scritti ogni
    // volta in un formato diverso e nessun confronto SQL li riconoscerebbe.
    const { data: esistenti, error } = await supabase
        .from('buyers')
        .select('id, full_name, phone, email, ruolo, notes')
        .is('deleted_at', null);
    if (error) { console.error('Rubrica non leggibile:', error); return null; }

    const chiave = chiaveTelefono(telefono);
    const gia = (esistenti || []).find(b =>
        (chiave && chiaveTelefono(b.phone) === chiave) ||
        (posta && emailNormalizzata(b.email) === posta)
    );

    if (gia) {
        // Si riempiono solo i buchi. Quello che c'e' gia' in rubrica e'
        // stato scritto o corretto a mano, e un documento compilato di
        // fretta non deve sovrascriverlo.
        const patch = {};
        if (!gia.phone && telefono) patch.phone = telefono;
        if (!gia.email && posta) patch.email = posta;
        const unito = ruoloUnito(gia.ruolo, ruolo);
        if (unito !== gia.ruolo) patch.ruolo = unito;

        if (Object.keys(patch).length > 0) {
            await supabase.from('buyers').update(patch).eq('id', gia.id);
        }
        return gia.id;
    }

    const { data: creato, error: erroreInserimento } = await supabase
        .from('buyers')
        .insert([{
            full_name: fullName,
            phone: telefono || null,
            email: posta,
            status: 'Attivo',
            ruolo: ruolo,
            source: 'documento',
            is_read: true,          // non e' una richiesta da leggere: l'hai davanti
            notes: 'Aggiunto in automatico da un documento del gestionale.'
        }])
        .select('id')
        .single();

    if (erroreInserimento) { console.error('Rubrica, inserimento fallito:', erroreInserimento); return null; }
    return creato.id;
}

/**
 * Le persone di un documento, con il ruolo che hanno in quell'atto.
 * L'incarico ha solo il proprietario; la proposta ha il proponente che
 * compra e il venditore che vende.
 *
 * @returns {{persone: object[], principale: number}} "principale" e'
 *          l'indice di chi va agganciato al documento come suo cliente.
 */
function personeDelDocumento(tipo, dati) {
    if (tipo === 'incarico') {
        return {
            persone: [{
                nome: dati.propNome, cell: dati.propCell, tel: dati.propTel,
                email: dati.propEmail, ruolo: 'venditore'
            }],
            principale: 0
        };
    }
    return {
        persone: [
            { nome: dati.proponenteNome, cell: dati.proponenteCell, tel: dati.proponenteTel,
              email: dati.proponenteEmail, ruolo: 'acquirente' },
            { nome: dati.venditoreNome, cell: '', tel: dati.venditoreTel,
              email: dati.venditoreEmail, ruolo: 'venditore' }
        ],
        // Il "cliente" di una proposta e' chi la firma: il proponente.
        principale: 0
    };
}

/**
 * Collega il salvataggio bozze a un modulo documento.
 *
 * @param {object}   opzioni
 * @param {string}   opzioni.tipo            Valore della colonna "tipo" ('incarico' | 'proposta').
 * @param {object}   opzioni.supabase        Client Supabase gia' inizializzato dalla pagina.
 * @param {HTMLFormElement} opzioni.form     Form del documento.
 * @param {HTMLElement}     opzioni.loading  Riquadro del loader (classe .active).
 * @param {function} opzioni.ricavaTitolo    (dati) => titolo mostrato nell'elenco del gestionale.
 * @param {function} opzioni.generaPDF       (dati) => genera il PDF; definita nella pagina.
 * @param {function} [opzioni.dopoPopolamento] Chiamata dopo aver ripopolato il form
 *                                             (l'incarico la usa per i campi condizionali).
 */
function initBozze({ tipo, supabase, form, loading, ricavaTitolo, generaPDF, dopoPopolamento }) {
    // Id della bozza aperta: nullo finche' non se ne salva o se ne carica una.
    let currentDraftId = null;

    // Collegamenti a immobile e cliente. Arrivano dall'indirizzo quando il
    // documento viene aperto da una scheda del gestionale
    // (es. incarico.html?property_id=12), oppure dalla bozza stessa quando
    // se ne riapre una gia' collegata. Servono a far esistere anche nei dati
    // la catena immobile -> incarico -> proposta -> vendita, che prima
    // stava solo nella testa di chi compilava.
    const parametri = new URLSearchParams(window.location.search);
    let collegamenti = {
        property_id: parametri.get('property_id') || null,
        buyer_id: parametri.get('buyer_id') || null
    };

    const statoBozza = document.getElementById('draft-status');

    function mostraStato(testo) {
        if (statoBozza) statoBozza.innerText = testo;
    }

    // Ripopola il form da un oggetto {name: valore}: per checkbox/radio
    // confronta il value dell'input (funziona perche' quei campi usano
    // name condivisi con value distinti, es. name="planimetria").
    function popolaForm(dati) {
        form.reset();
        Object.entries(dati || {}).forEach(([name, value]) => {
            form.querySelectorAll(`[name="${CSS.escape(name)}"]`).forEach(el => {
                if (el.type === 'checkbox' || el.type === 'radio') {
                    el.checked = (el.value === value);
                } else {
                    el.value = value;
                }
            });
        });
        if (dopoPopolamento) dopoPopolamento();
    }

    async function caricaBozza(id) {
        const { data, error } = await supabase.from('documenti_bozze').select('*').eq('id', id).eq('tipo', tipo).single();
        if (error || !data) {
            alert('Bozza non trovata (potrebbe essere stata eliminata).');
            return;
        }
        currentDraftId = data.id;
        // I collegamenti gia' salvati vincono su quelli dell'indirizzo:
        // riaprire una bozza non deve poterla riagganciare altrove per
        // sbaglio, ma se non ne aveva li' si possono aggiungere.
        collegamenti = {
            property_id: data.property_id || collegamenti.property_id || null,
            buyer_id: data.buyer_id || collegamenti.buyer_id || null
        };
        popolaForm(data.dati || {});
        mostraStato(`Stai modificando una bozza salvata (ultimo salvataggio: ${new Date(data.updated_at).toLocaleString('it-IT')})`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function salvaBozza(showAlert = true) {
        const dati = Object.fromEntries(new FormData(form));
        const nowIso = new Date().toISOString();

        // Le persone del documento entrano in rubrica prima del salvataggio,
        // cosi' il documento nasce gia' agganciato alla scheda del suo
        // cliente. Se qualcosa va storto qui la bozza si salva lo stesso:
        // perdere il documento perche' la rubrica ha singhiozzato sarebbe
        // molto peggio di non aver aggiornato un contatto.
        try {
            const { persone, principale } = personeDelDocumento(tipo, dati);
            const ids = [];
            for (const persona of persone) {
                ids.push(await portaInRubrica(supabase, persona));
            }
            if (!collegamenti.buyer_id && ids[principale]) {
                collegamenti.buyer_id = ids[principale];
            }
        } catch (err) {
            console.error('Rubrica non aggiornata da questo documento:', err);
        }

        const payload = {
            tipo, titolo: ricavaTitolo(dati), dati, updated_at: nowIso,
            property_id: collegamenti.property_id,
            buyer_id: collegamenti.buyer_id
        };

        try {
            if (currentDraftId) {
                const { error } = await supabase.from('documenti_bozze').update(payload).eq('id', currentDraftId);
                if (error) throw error;
            } else {
                payload.created_at = nowIso;
                const { data: inserted, error } = await supabase.from('documenti_bozze').insert([payload]).select().single();
                if (error) throw error;
                currentDraftId = inserted.id;
                // Da qui in poi la pagina "e'" quella bozza: mettendo l'id
                // nell'URL un ricaricamento riapre la stessa, non ne crea una nuova.
                const url = new URL(window.location.href);
                url.searchParams.set('id', currentDraftId);
                window.history.replaceState({}, '', url);
            }
            mostraStato(`Bozza salvata nel gestionale (${new Date().toLocaleString('it-IT')})`);
            if (showAlert) alert('Bozza salvata nel gestionale!');
            return true;
        } catch (err) {
            console.error('Errore salvataggio bozza:', err);
            if (showAlert) alert('Errore nel salvataggio della bozza: ' + err.message);
            return false;
        }
    }

    // "Genera PDF": prima il PDF, poi il salvataggio silenzioso della bozza
    // (showAlert=false), cosi' l'utente vede un solo messaggio finale.
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!form.checkValidity()) {
            alert('Completa tutti i campi obbligatori');
            return;
        }

        loading.classList.add('active');

        try {
            const dati = Object.fromEntries(new FormData(form));
            generaPDF(dati);
            await salvaBozza(false);
            alert('PDF generato e bozza salvata nel gestionale!');
        } catch (error) {
            console.error('Errore:', error);
            alert('Errore nella generazione: ' + error.message);
        } finally {
            loading.classList.remove('active');
        }
    });

    // Esposte sul window perche' servono agli handler inline gia' presenti nel
    // markup (`onclick="salvaBozza()"`) e al controllo di sessione, che vive in
    // un altro <script> della pagina.
    window.caricaBozza = caricaBozza;
    window.salvaBozza = salvaBozza;

    return { caricaBozza, salvaBozza };
}
