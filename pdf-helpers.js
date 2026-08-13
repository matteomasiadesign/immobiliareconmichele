/*
 * Kit di funzioni condivise per la generazione dei PDF (jsPDF)
 * usato da incarico.html e proposta.html.
 * Estratto per evitare la duplicazione del motore di impaginazione.
 */
function creaPdfKit(doc) {
    const BLU = [30, 95, 217];
    const GIALLO = [255, 215, 0];
    const NERO = [34, 34, 34];
    const GRIGIO = [110, 110, 110];

    const PW = doc.internal.pageSize.getWidth();
    const PH = doc.internal.pageSize.getHeight();
    const M = 16;                 // margine
    const CW = PW - 2 * M;        // larghezza contenuto
    const FOOTER_Y = PH - 12;     // soglia footer
    let y = M;

    // ---- helper: check spazio / nuova pagina ----
    function ensure(space) {
        if (y + space > FOOTER_Y - 4) {
            addFooter();
            doc.addPage();
            y = M;
        }
    }

    // ---- helper: footer su ogni pagina ----
    function addFooter() {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...GRIGIO);
        doc.text('Michele Erre · Agente Immobiliare · REA: SS-227691 · Via Libio 80, Porto Torres · Tel. 3348576926', PW / 2, FOOTER_Y, { align: 'center' });
    }

    // ---- helper: titolo sezione con barra gialla ----
    function sezione(titolo) {
        ensure(14);
        y += 3;
        doc.setFillColor(...GIALLO);
        doc.rect(M, y - 3.5, 3, 5, 'F');         // tacca gialla
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(...BLU);
        doc.text(titolo.toUpperCase(), M + 5, y);
        y += 2.5;
        doc.setDrawColor(...GIALLO);
        doc.setLineWidth(0.5);
        doc.line(M, y, PW - M, y);
        y += 5;
    }

    // ---- helper: campo etichetta + valore su riga ----
    function campo(label, valore, opt = {}) {
        const val = (valore === undefined || valore === null || valore === '') ? '—' : String(valore);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...BLU);
        const labelW = doc.getTextWidth(label + ': ');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...NERO);
        const valLines = doc.splitTextToSize(val, CW - labelW - 1);
        const blockH = Math.max(4.5, valLines.length * 4.2);
        ensure(blockH + 1);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...BLU);
        doc.text(label + ':', M, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...NERO);
        doc.text(valLines, M + labelW, y);
        y += blockH + 1.5;
    }

    // ---- helper: due campi affiancati ----
    function campoDoppio(l1, v1, l2, v2) {
        ensure(6);
        const col = CW / 2;
        const v1s = (v1 === undefined || v1 === '' || v1 === null) ? '—' : String(v1);
        const v2s = (v2 === undefined || v2 === '' || v2 === null) ? '—' : String(v2);
        // colonna 1
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...BLU);
        const w1 = doc.getTextWidth(l1 + ': ');
        doc.text(l1 + ':', M, y);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...NERO);
        doc.text(doc.splitTextToSize(v1s, col - w1 - 3), M + w1, y);
        // colonna 2
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...BLU);
        const w2 = doc.getTextWidth(l2 + ': ');
        doc.text(l2 + ':', M + col, y);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...NERO);
        doc.text(doc.splitTextToSize(v2s, col - w2 - 1), M + col + w2, y);
        y += 6;
    }

    // ---- helper: paragrafo legale giustificato ----
    function paragrafo(testo, opt = {}) {
        doc.setFont('helvetica', opt.bold ? 'bold' : 'normal');
        doc.setFontSize(opt.size || 8.2);
        doc.setTextColor(...(opt.color || NERO));
        const lines = doc.splitTextToSize(testo, CW);
        lines.forEach(line => {
            ensure(4.2);
            doc.text(line, M, y, { align: 'left', maxWidth: CW });
            y += 4.2;
        });
        y += (opt.gap !== undefined ? opt.gap : 2);
    }

    // ---- helper: opzioni con checkbox ----
    // opzioni = [{txt, on}] - label vuota o omessa = riga di sole opzioni, senza etichetta
    function checkLine(label, opzioni) {
        ensure(5);
        const hasLabel = label && label.trim() !== '';
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...BLU);
        let labelW = 0;
        if (hasLabel) {
            doc.text(label + ':', M, y);
            labelW = doc.getTextWidth(label + ': ');
        }

        // calcolo larghezza totale opzioni
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
        const segs = opzioni.map(o => (o.on ? '[X] ' : '[  ] ') + o.txt);
        const gap = doc.getTextWidth('    ');
        const totW = segs.reduce((s, t) => s + doc.getTextWidth(t) + gap, 0);

        // se le opzioni non stanno accanto all'etichetta, vado a capo e parto da sinistra rientrato
        let x, startX;
        if (!hasLabel) {
            x = M + 4; startX = M + 4;
        } else if (labelW + totW > CW) {
            y += 4.2;
            ensure(5);
            x = M + 4; startX = M + 4;
        } else {
            x = M + labelW + 1; startX = M + labelW + 1;
        }

        doc.setTextColor(...NERO);
        segs.forEach((seg, idx) => {
            const segW = doc.getTextWidth(seg) + gap;
            if (x + segW > PW - M) { y += 4.2; x = startX; ensure(5); }
            doc.setFont('helvetica', opzioni[idx].on ? 'bold' : 'normal');
            doc.text(seg, x, y);
            x += segW;
        });
        doc.setFont('helvetica', 'normal');
        y += 5.5;
    }

    // ---- helper: blocco firma ----
    function firma(label) {
        ensure(20);
        y += 8;
        doc.setDrawColor(...NERO);
        doc.setLineWidth(0.3);
        doc.line(M, y, M + 70, y);
        y += 4;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRIGIO);
        doc.text(label, M, y);
        y += 6;
    }

    // ---- prezzo in lettere (italiano) ----
    function numeroInLettere(n) {
        n = Math.floor(Number(n));
        if (!n || n <= 0) return '';
        const unita = ['', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci',
            'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove'];
        const decine = ['', '', 'venti', 'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta', 'ottanta', 'novanta'];

        function sotto1000(x) {
            let s = '';
            const c = Math.floor(x / 100), r = x % 100;
            if (c === 1) s += 'cento';
            else if (c > 1) s += unita[c] + 'cento';
            // elisione: cento + ottanta = centottanta
            if (s.endsWith('cento') && Math.floor(r / 10) === 8) s = s.slice(0, -1);
            if (r < 20) s += unita[r];
            else {
                const d = Math.floor(r / 10), u = r % 10;
                let dd = decine[d];
                if (u === 1 || u === 8) dd = dd.slice(0, -1); // ventuno, ventotto
                s += dd + unita[u];
            }
            return s;
        }

        let out = '';
        const milioni = Math.floor(n / 1000000);
        const migliaia = Math.floor((n % 1000000) / 1000);
        const resto = n % 1000;

        if (milioni === 1) out += 'unmilione';
        else if (milioni > 1) out += sotto1000(milioni) + 'milioni';

        if (migliaia === 1) out += 'mille';
        else if (migliaia > 1) out += sotto1000(migliaia) + 'mila';

        out += sotto1000(resto);
        return out;
    }

    // ---- finalizzazione: footer sull'ultima pagina + numerazione + salvataggio ----
    function finalize(filename) {
        addFooter();
        const tot = doc.internal.getNumberOfPages();
        for (let i = 1; i <= tot; i++) {
            doc.setPage(i);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(...GRIGIO);
            doc.text(`Pagina ${i} di ${tot}`, PW - M, FOOTER_Y, { align: 'right' });
        }
        doc.save(filename);
    }

    // ---- accesso alla posizione verticale corrente ----
    // Espone "y" a chi disegna intestazioni personalizzate fuori dagli
    // helper qui sopra (es. il box titolo in incarico.html/proposta.html),
    // cosi' restano sincronizzati con lo stesso contatore usato da sezione/
    // campo/paragrafo invece di avere una propria variabile "y" scollegata.
    function getY() { return y; }
    function setY(v) { y = v; }

    return {
        BLU, GIALLO, NERO, GRIGIO, PW, PH, M, CW, FOOTER_Y,
        ensure, addFooter, sezione, campo, campoDoppio, paragrafo, checkLine, firma, numeroInLettere, finalize,
        getY, setY
    };
}
