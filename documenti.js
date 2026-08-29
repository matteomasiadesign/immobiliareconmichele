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
 * Nome ridotto all'osso per il confronto: via accenti, punteggiatura e
 * spazi doppi. "Anna  Piras" e "Anna Pìras" sono la stessa persona.
 */
const nomeNormalizzato = n => (n || '').toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

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
async function portaInRubrica(supabase, { nome, cell, tel, email, ruolo, cf }) {
    const fullName = (nome || '').trim();
    const telefono = (cell || '').trim() || (tel || '').trim();
    const posta = emailNormalizzata(email);

    // Senza nome non si va da nessuna parte.
    if (!fullName) return null;

    // Un nome senza recapiti puo' essere due cose molto diverse: una bozza
    // aperta e abbandonata a meta', oppure una persona che ha davvero
    // firmato un atto e di cui semplicemente non e' stato scritto il
    // numero. La prima e' rumore, la seconda no - ed e' proprio quella che
    // in rubrica serve di piu'.
    //
    // A distinguerle e' il codice fiscale: chi ce l'ha e' stato
    // identificato con un documento in mano, non e' una prova di
    // compilazione. Lo si usa solo come segnale: in rubrica NON viene
    // copiato, resta nell'atto dove serve.
    const identificato = !!(cf || '').trim();
    if (!telefono && !posta && !identificato) return null;

    // La rubrica di un'agenzia sta in poche centinaia di righe: si leggono
    // tutte e si confronta in memoria, perche' i numeri sono scritti ogni
    // volta in un formato diverso e nessun confronto SQL li riconoscerebbe.
    const { data: esistenti, error } = await supabase
        .from('buyers')
        .select('id, full_name, phone, email, ruolo, notes')
        .is('deleted_at', null);
    if (error) { console.error('Rubrica non leggibile:', error); return null; }

    const chiave = chiaveTelefono(telefono);
    let gia = (esistenti || []).find(b =>
        (chiave && chiaveTelefono(b.phone) === chiave) ||
        (posta && emailNormalizzata(b.email) === posta)
    );

    // Ultima spiaggia: il nome, ma confrontato SOLO con le schede che non
    // hanno ne' telefono ne' email.
    //
    // Quelle schede mute nascono da una persona identificata dal solo
    // codice fiscale, e senza questo passaggio non sarebbero confrontabili
    // con niente: ogni sincronizzazione ne creerebbe una copia, e il giorno
    // che salta fuori il numero nascerebbe l'ennesimo doppione invece di
    // completare quella che c'e' gia'.
    //
    // Limitarlo alle schede mute e' quello che tiene separati gli omonimi:
    // due "Anna Piras" con due numeri diversi restano due persone, perche'
    // nessuna delle due e' muta.
    if (!gia) {
        const cercato = nomeNormalizzato(fullName);
        gia = (esistenti || []).find(b =>
            !chiaveTelefono(b.phone) && !emailNormalizzata(b.email) &&
            nomeNormalizzato(b.full_name) === cercato
        );
    }

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
                email: dati.propEmail, cf: dati.propCF, ruolo: 'venditore'
            }],
            principale: 0
        };
    }
    return {
        persone: [
            // Il modulo della proposta non chiede il cellulare del
            // venditore: per lui c'e' solo il fisso.
            { nome: dati.proponenteNome, cell: dati.proponenteCell, tel: dati.proponenteTel,
              email: dati.proponenteEmail, cf: dati.proponenteCF, ruolo: 'acquirente' },
            { nome: dati.venditoreNome, cell: '', tel: dati.venditoreTel,
              email: dati.venditoreEmail, cf: dati.venditoreCF, ruolo: 'venditore' }
        ],
        // Il "cliente" di una proposta e' chi la firma: il proponente.
        principale: 0
    };
}

/**
 * Nomi leggibili per i campi dell'atto nei log di modifica.
 */
function descriviCampoDoc(name) {
    const labels = {
        propNome: 'Nome proprietario',
        propCell: 'Cellulare proprietario',
        propTel: 'Telefono proprietario',
        propEmail: 'Email proprietario',
        propCF: 'Codice fiscale proprietario',
        propIndirizzo: 'Indirizzo proprietario',
        immUbicazione: 'Ubicazione immobile',
        immDatiCatastali: 'Dati catastali',
        prezzo: 'Prezzo richiesto',
        proponenteNome: 'Nome proponente',
        proponenteCell: 'Cellulare proponente',
        proponenteTel: 'Telefono proponente',
        proponenteEmail: 'Email proponente',
        proponenteCF: 'Codice fiscale proponente',
        venditoreNome: 'Nome venditore',
        venditoreTel: 'Telefono venditore',
        prezzoTotale: 'Prezzo offerto',
        caparra1: 'Caparra confirmatoria',
        caparra2: 'Integrazione caparra',
        saldo: 'Saldo prezzo',
        rogitoData: 'Data rogito',
        incaricoInizio: 'Data inizio incarico',
        incaricoFine: 'Data scadenza incarico',
        provvigionePerc: '% Provvigione',
        provvigioneEuro: 'Provvigione (€)',
        formaIncarico: 'Esclusività incarico',
        disdettaGiorni: 'Giorni preavviso disdetta',
        dataFirma: 'Data firma',
        luogoFirma: 'Luogo firma',
        note: 'Note',
        _stato_doc: 'Stato documento',
        _data_documento: 'Data atto/firma',
        _note_doc: 'Note documento'
    };
    return labels[name] || name;
}

/**
 * Confronta due stati del documento e restituisce un elenco sintetico delle modifiche.
 */
function calcolaDifferenzeDati(vecchi = {}, nuovi = {}) {
    const modificate = [];
    const tuttiKeys = new Set([...Object.keys(vecchi), ...Object.keys(nuovi)]);
    tuttiKeys.forEach(k => {
        if (k.startsWith('_') && k !== '_stato_doc' && k !== '_data_documento' && k !== '_note_doc') return;
        const v1 = (vecchi[k] !== undefined && vecchi[k] !== null) ? String(vecchi[k]).trim() : '';
        const v2 = (nuovi[k] !== undefined && nuovi[k] !== null) ? String(nuovi[k]).trim() : '';
        if (v1 !== v2) {
            const label = descriviCampoDoc(k);
            if (!v1 && v2) {
                modificate.push(`Impostato ${label}: "${v2.length > 30 ? v2.slice(0, 30) + '...' : v2}"`);
            } else if (v1 && !v2) {
                modificate.push(`Cancellato ${label}`);
            } else {
                modificate.push(`Modificato ${label}: da "${v1.length > 20 ? v1.slice(0, 20) + '...' : v1}" a "${v2.length > 20 ? v2.slice(0, 20) + '...' : v2}"`);
            }
        }
    });
    return modificate;
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
    const parametri = new URLSearchParams(window.location.search);
    let currentDraftId = parametri.get('id') || null;
    let loadedDocData = null; // contiene l'intero record dal DB (compreso created_at)
    let loadedDocState = null; // memorizza solo dati del form
    const isViewMode = parametri.get('mode') === 'view';

    let collegamenti = {
        property_id: parametri.get('property_id') || null,
        buyer_id: parametri.get('buyer_id') || null
    };

    const statoBozza = document.getElementById('draft-status');

    function mostraStato(testo, isSigned = false) {
        if (!statoBozza) return;
        statoBozza.innerHTML = testo;
        if (isSigned) {
            statoBozza.style.color = '#107a3c';
            statoBozza.style.fontWeight = '600';
        } else {
            statoBozza.style.color = '';
            statoBozza.style.fontWeight = '';
        }
    }

    function popolaForm(dati) {
        form.reset();
        Object.entries(dati || {}).forEach(([name, value]) => {
            if (name.startsWith('_')) return; // ignora metadati interni
            form.querySelectorAll(`[name="${CSS.escape(name)}"]`).forEach(el => {
                if (el.type === 'checkbox' || el.type === 'radio') {
                    el.checked = (el.value === value);
                } else {
                    el.value = value;
                }
            });
        });
        if (dopoPopolamento) dopoPopolamento();

        if (isViewMode) {
            impostaModalitaVisualizzazione();
        }
    }

    function impostaModalitaVisualizzazione() {
        form.querySelectorAll('input, select, textarea').forEach(el => {
            el.disabled = true;
        });
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerText = '🖨️ Scarica / Stampa PDF';
        }
        const saveDraftBtn = document.getElementById('btn-save-draft');
        if (saveDraftBtn) {
            saveDraftBtn.style.display = 'none';
        }

        const banner = document.createElement('div');
        banner.className = 'doc-view-banner';
        banner.style.cssText = 'background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; padding:12px 18px; border-radius:8px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;';
        banner.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:18px;">👁️</span>
                <span><b>Modalità Sola Lettura:</b> puoi consultare l'atto o scaricare il PDF.</span>
            </div>
            <div>
                <a href="${tipo}.html?id=${encodeURIComponent(currentDraftId)}" class="btn-mini" style="background:#0284c7; color:#fff; padding:6px 12px; border-radius:6px; text-decoration:none; font-weight:600;">✏️ Passa a Modifica</a>
            </div>
        `;
        form.parentNode.insertBefore(banner, form);
    }

    async function caricaBozza(id) {
        const { data, error } = await supabase.from('documenti_bozze').select('*').eq('id', id).eq('tipo', tipo).single();
        if (error || !data) {
            alert('Bozza non trovata (potrebbe essere stata eliminata).');
            return;
        }
        currentDraftId = data.id;
        loadedDocData = data;
        loadedDocState = data.dati || {};
        
        collegamenti = {
            property_id: data.property_id || collegamenti.property_id || null,
            buyer_id: data.buyer_id || collegamenti.buyer_id || null
        };
        popolaForm(data.dati || {});

        const stato = data.dati?._stato_doc || 'bozza';
        const dataAtto = data.dati?._data_documento || data.dati?.dataFirma || '';
        const dataAttoStr = dataAtto ? new Date(dataAtto).toLocaleDateString('it-IT') : '';

        if (stato === 'firmato') {
            mostraStato(`✍️ Documento FIRMATO ${dataAttoStr ? `(data atto: ${dataAttoStr})` : ''} · Creato il: ${new Date(data.created_at || data.updated_at).toLocaleDateString('it-IT')}`, true);
        } else if (stato === 'consegnato') {
            mostraStato(`⏳ Documento CONSEGNATO AL CLIENTE · Ultima modifica: ${new Date(data.updated_at).toLocaleString('it-IT')}`);
        } else {
            mostraStato(`📝 Bozza in lavorazione (creata il ${new Date(data.created_at || data.updated_at).toLocaleDateString('it-IT')} · ultima modifica: ${new Date(data.updated_at).toLocaleString('it-IT')})`);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function salvaBozza(showAlert = true) {
        if (isViewMode) {
            // In sola visualizzazione il salvataggio non deve avvenire
            return true;
        }

        const formData = Object.fromEntries(new FormData(form));
        const nowIso = new Date().toISOString();

        // Preserva i metadati interni precedenti
        const dati = {
            ...(loadedDocState || {}),
            ...formData
        };

        if (!dati._stato_doc) {
            dati._stato_doc = 'bozza';
        }
        if (dati.dataFirma && !dati._data_documento) {
            dati._data_documento = dati.dataFirma;
        }

        // Calcola lo storico delle modifiche (Audit Log)
        const history = Array.isArray(dati._history) ? [...dati._history] : [];
        if (history.length === 0) {
            const dataCreazione = (loadedDocData && loadedDocData.created_at) ? loadedDocData.created_at : nowIso;
            history.push({
                timestamp: dataCreazione,
                action: 'creazione',
                summary: 'Creazione del documento',
                details: []
            });
        }

        if (loadedDocState) {
            const differenze = calcolaDifferenzeDati(loadedDocState, dati);
            if (differenze.length > 0) {
                history.push({
                    timestamp: nowIso,
                    action: 'modifica',
                    summary: differenze.slice(0, 3).join('; ') + (differenze.length > 3 ? ` (+${differenze.length - 3} altre modifiche)` : ''),
                    details: differenze
                });
            }
        }
        dati._history = history;

        // Le persone del documento entrano in rubrica
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
            tipo,
            titolo: ricavaTitolo(dati),
            dati,
            updated_at: nowIso,
            property_id: collegamenti.property_id,
            buyer_id: collegamenti.buyer_id
        };

        try {
            if (currentDraftId) {
                // Aggiornamento sul record esistente: created_at rimane intatto
                const { data: updated, error } = await supabase.from('documenti_bozze').update(payload).eq('id', currentDraftId).select().single();
                if (error) throw error;
                loadedDocData = updated || loadedDocData;
            } else {
                // Primo inserimento: salva created_at
                payload.created_at = nowIso;
                const { data: inserted, error } = await supabase.from('documenti_bozze').insert([payload]).select().single();
                if (error) throw error;
                currentDraftId = inserted.id;
                loadedDocData = inserted;
                const url = new URL(window.location.href);
                url.searchParams.set('id', currentDraftId);
                window.history.replaceState({}, '', url);
            }
            loadedDocState = dati;
            mostraStato(`Salvataggio completato (${new Date().toLocaleTimeString('it-IT')})`);
            if (showAlert) alert('Documento salvato con successo!');
            return true;
        } catch (err) {
            console.error('Errore salvataggio documento:', err);
            if (showAlert) alert('Errore nel salvataggio: ' + err.message);
            return false;
        }
    }

    async function salvaComeNuovaCopia() {
        if (!confirm("Vuoi creare una NUOVA copia separata di questo documento? L'atto originale rimarrà intatto nello storico.")) return;
        currentDraftId = null;
        loadedDocData = null;
        if (loadedDocState) {
            loadedDocState._stato_doc = 'bozza';
            loadedDocState._history = [{
                timestamp: new Date().toISOString(),
                action: 'duplicazione',
                summary: 'Nuova copia creata da documento precedente',
                details: []
            }];
        }
        await salvaBozza(true);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!form.checkValidity()) {
            alert('Completa tutti i campi obbligatori');
            return;
        }

        loading.classList.add('active');

        try {
            const formData = Object.fromEntries(new FormData(form));
            generaPDF(formData);
            if (!isViewMode) {
                await salvaBozza(false);
            }
        } catch (error) {
            console.error('Errore:', error);
            alert('Errore nella generazione del PDF: ' + error.message);
        } finally {
            loading.classList.remove('active');
        }
    });

    window.caricaBozza = caricaBozza;
    window.salvaBozza = salvaBozza;
    window.salvaComeNuovaCopia = salvaComeNuovaCopia;

    return { caricaBozza, salvaBozza, salvaComeNuovaCopia };
}
