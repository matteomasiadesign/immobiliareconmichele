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
        popolaForm(data.dati || {});
        mostraStato(`Stai modificando una bozza salvata (ultimo salvataggio: ${new Date(data.updated_at).toLocaleString('it-IT')})`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function salvaBozza(showAlert = true) {
        const dati = Object.fromEntries(new FormData(form));
        const nowIso = new Date().toISOString();
        const payload = { tipo, titolo: ricavaTitolo(dati), dati, updated_at: nowIso };

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
