/*
 * =====================================================================
 * CARTELLO VETRINA GENERATOR (A4 / A3 - Verticale & Orizzontale)
 * Immobiliare con Michele · Michele Erre
 *
 * Genera PDF ad alta risoluzione pronti per la stampa (300 DPI) per
 * espositori da vetrina, tasche LED e bacheche agenzia.
 * =====================================================================
 */

/**
 * Converte un URL immagine in Base64 per jsPDF
 */
async function urlToBase64(url) {
    if (!url) return null;
    try {
        const response = await fetch(url, { mode: 'cors' });
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        // Fallback tramite elemento Image + canvas
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/jpeg', 0.92));
                } catch (err) {
                    resolve(null);
                }
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    }
}

/**
 * Genera un QR Code in Base64 Data URL
 */
async function generaQRCodeDataUrl(text) {
    if (typeof QRCode !== 'undefined' && QRCode.toDataURL) {
        try {
            return await QRCode.toDataURL(text, {
                width: 320,
                margin: 1,
                color: {
                    dark: '#002266',
                    light: '#FFFFFF'
                }
            });
        } catch (err) {
            console.error('Errore generazione QR:', err);
        }
    }
    // Fallback generatore QR pubblico se la libreria non fosse ancora disponibile
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;
}

/**
 * Funzione principale di generazione del Cartello Vetrina
 *
 * @param {object} opzioni
 * @param {object} opzioni.property        Oggetto immobile dal database
 * @param {string} [opzioni.format='a4']   'a4' | 'a3'
 * @param {string} [opzioni.orientation='p'] 'p' (verticale) | 'l' (orizzontale)
 * @param {string} [opzioni.theme='light'] 'light' | 'luxury'
 * @param {boolean} [opzioni.showPrice=true] Mostra prezzo in chiaro o trattativa riservata
 * @param {string} [opzioni.customText]    Testo promozionale personalizzato (opzionale)
 * @param {number} [opzioni.photoCount=1]  1 (solo hero) | 3 (hero + 2 miniature)
 * @returns {Promise<jsPDF>}
 */
async function generaCartelloVetrinaPDF({
    property,
    format = 'a4',
    orientation = 'p',
    theme = 'auto',
    showPrice = true,
    customText = '',
    photoCount = 3
}) {
    if (!property) throw new Error("Immobile non specificato");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: format,
        compress: true
    });

    const isLuxury = theme === 'luxury' || (theme === 'auto' && Boolean(property.is_luxury));
    const isLandscape = orientation === 'l';
    const isA3 = format === 'a3';

    // Dimensioni pagina in mm
    const PW = doc.internal.pageSize.getWidth();
    const PH = doc.internal.pageSize.getHeight();

    // Palette Colori
    const C_BG = isLuxury ? [10, 20, 42] : [255, 255, 255];
    const C_CARD = isLuxury ? [16, 32, 64] : [246, 248, 252];
    const C_TEXT = isLuxury ? [255, 255, 255] : [15, 23, 42];
    const C_MUTED = isLuxury ? [180, 195, 220] : [80, 95, 120];
    const C_ACCENT = isLuxury ? [212, 168, 83] : [0, 68, 255]; // Oro per luxury, Blu per standard
    const C_YELLOW = [255, 217, 15];
    const C_BORDER = isLuxury ? [35, 55, 95] : [226, 232, 240];

    // Sfondo pagina
    doc.setFillColor(...C_BG);
    doc.rect(0, 0, PW, PH, 'F');

    // Margini
    const M = isA3 ? 18 : 12;
    const CW = PW - (M * 2);

    // Prepara URL per il QR Code
    const baseUrl = 'https://immobiliareconmichele.it';
    const propertyUrl = property.is_luxury 
        ? `${baseUrl}/luxury.html?id=${property.id}`
        : `${baseUrl}/catalogo.html?id=${property.id}`;

    // Carica Immagini & QR Code in parallelo
    const images = Array.isArray(property.images) ? property.images : [];
    const [heroBase64, thumb1Base64, thumb2Base64, qrBase64] = await Promise.all([
        images[0] ? urlToBase64(images[0]) : null,
        (photoCount >= 2 && images[1]) ? urlToBase64(images[1]) : null,
        (photoCount >= 3 && images[2]) ? urlToBase64(images[2]) : null,
        generaQRCodeDataUrl(propertyUrl)
    ]);

    // =========================================================================
    // LAYOUT 1: VERTICALE (PORTRAIT) - A4 o A3
    // =========================================================================
    if (!isLandscape) {
        let currentY = M;

        // 1. HEADER BRANDING
        const headerH = isA3 ? 24 : 18;
        doc.setFillColor(...C_CARD);
        doc.roundedRect(M, currentY, CW, headerH, 3, 3, 'F');
        doc.setDrawColor(...C_BORDER);
        doc.roundedRect(M, currentY, CW, headerH, 3, 3, 'S');

        // Logo / Titolo Agenzia
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isA3 ? 18 : 13.5);
        doc.setTextColor(...C_ACCENT);
        doc.text('IMMOBILIARE CON MICHELE', M + (isA3 ? 8 : 6), currentY + (isA3 ? 10 : 8));

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(isA3 ? 9.5 : 7.5);
        doc.setTextColor(...C_MUTED);
        doc.text('MICHELE ERRE · Agente Immobiliare · Porto Torres · Tel. 334 857 6926', M + (isA3 ? 8 : 6), currentY + (isA3 ? 17 : 13));

        // Badge Contratto (in alto a destra)
        const badgeTxt = isLuxury ? '💎 COLLEZIONE LUXURY' : (property.status === 'Vendita' ? 'IN VENDITA' : 'IN AFFITTO');
        const badgeW = isA3 ? 55 : 40;
        const badgeH = isA3 ? 11 : 8.5;
        const badgeX = PW - M - badgeW - (isA3 ? 6 : 4);
        const badgeY = currentY + (headerH - badgeH) / 2;

        doc.setFillColor(...(isLuxury ? [212, 168, 83] : [0, 68, 255]));
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isA3 ? 9.5 : 7.5);
        doc.setTextColor(255, 255, 255);
        doc.text(badgeTxt, badgeX + (badgeW / 2), badgeY + (badgeH / 2) + (isA3 ? 1.5 : 1), { align: 'center' });

        currentY += headerH + (isA3 ? 6 : 4);

        // 2. FOTO HERO PRINCIPALE & MINIATURE
        const hasThumbs = (thumb1Base64 || thumb2Base64);
        const heroHeight = isA3 ? (hasThumbs ? 150 : 190) : (hasThumbs ? 105 : 135);

        if (heroBase64) {
            doc.addImage(heroBase64, 'JPEG', M, currentY, CW, heroHeight, undefined, 'FAST');
            doc.setDrawColor(...C_BORDER);
            doc.setLineWidth(0.6);
            doc.rect(M, currentY, CW, heroHeight, 'S');
        } else {
            // Placeholder foto
            doc.setFillColor(...C_CARD);
            doc.rect(M, currentY, CW, heroHeight, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(...C_MUTED);
            doc.text('Immagine Immobile', PW / 2, currentY + (heroHeight / 2), { align: 'center' });
        }
        currentY += heroHeight;

        // Miniature sotto la foto principale (se presenti)
        if (hasThumbs) {
            currentY += (isA3 ? 4 : 3);
            const thumbGap = isA3 ? 4 : 3;
            const validThumbs = [thumb1Base64, thumb2Base64].filter(Boolean);
            const thumbW = (CW - (thumbGap * (validThumbs.length - 1))) / validThumbs.length;
            const thumbH = isA3 ? 42 : 28;

            validThumbs.forEach((tb, i) => {
                const tx = M + (i * (thumbW + thumbGap));
                doc.addImage(tb, 'JPEG', tx, currentY, thumbW, thumbH, undefined, 'FAST');
                doc.setDrawColor(...C_BORDER);
                doc.setLineWidth(0.4);
                doc.rect(tx, currentY, thumbW, thumbH, 'S');
            });
            currentY += thumbH;
        }

        currentY += (isA3 ? 8 : 5);

        // 3. TITOLO & PREZZO
        // Titolo immobile & Zona
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isA3 ? 20 : 14.5);
        doc.setTextColor(...C_TEXT);
        const maxTitleW = CW - (isA3 ? 85 : 65);
        const titleLines = doc.splitTextToSize(property.title || 'Immobile di Pregio', maxTitleW);
        doc.text(titleLines.slice(0, 2), M, currentY + (isA3 ? 6 : 4));

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(isA3 ? 12 : 9);
        doc.setTextColor(...C_MUTED);
        doc.text(`📍 ${property.zone || 'Porto Torres'} · ${property.property_type || 'Residenziale'}`, M, currentY + (isA3 ? 14 : 10) + (titleLines.length > 1 ? 5 : 0));

        // Riquadro Prezzo (a destra)
        const priceBoxW = isA3 ? 80 : 60;
        const priceBoxH = isA3 ? 20 : 15;
        const priceBoxX = PW - M - priceBoxW;
        const priceBoxY = currentY;

        doc.setFillColor(...(isLuxury ? [212, 168, 83] : [0, 68, 255]));
        doc.roundedRect(priceBoxX, priceBoxY, priceBoxW, priceBoxH, 2.5, 2.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isA3 ? 16 : 12);
        doc.setTextColor(255, 255, 255);
        const prezzoTxt = (showPrice && property.price && Number(property.price) > 0)
            ? `€ ${Number(property.price).toLocaleString('it-IT')}`
            : 'TRATTATIVA RISERVATA';
        doc.text(prezzoTxt, priceBoxX + (priceBoxW / 2), priceBoxY + (priceBoxH / 2) + (isA3 ? 2 : 1.5), { align: 'center' });

        currentY += (isA3 ? 24 : 17);

        // 4. GRIGLIA CHIP CARATTERISTICHE (Superficie, Vani, Bagni, ecc.)
        const specBoxH = isA3 ? 16 : 12;
        const specs = [
            property.sqm ? `📐 ${property.sqm} MQ` : null,
            property.rooms ? `🛏️ ${property.rooms} VANI` : null,
            property.bathrooms ? `🚿 ${property.bathrooms} ${property.bathrooms === 1 ? 'BAGNO' : 'BAGNI'}` : null,
            property.has_parking ? '🚗 GARAGE/POSTO AUTO' : null,
            '⚡ CLASSE ENERG. G'
        ].filter(Boolean);

        const specItemW = (CW - ((specs.length - 1) * 3)) / specs.length;
        specs.forEach((sp, i) => {
            const sx = M + (i * (specItemW + 3));
            doc.setFillColor(...C_CARD);
            doc.roundedRect(sx, currentY, specItemW, specBoxH, 2, 2, 'F');
            doc.setDrawColor(...C_BORDER);
            doc.roundedRect(sx, currentY, specItemW, specBoxH, 2, 2, 'S');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(isA3 ? 9.5 : 7);
            doc.setTextColor(...C_TEXT);
            doc.text(sp, sx + (specItemW / 2), currentY + (specBoxH / 2) + (isA3 ? 1.5 : 1), { align: 'center' });
        });

        currentY += specBoxH + (isA3 ? 6 : 4);

        // 5. BLOCCO DESCRIZIONE E QR CODE
        const bottomH = isA3 ? 42 : 32;
        const qrSize = bottomH - (isA3 ? 6 : 4);
        const descW = CW - qrSize - (isA3 ? 10 : 8);

        // Box Descrizione / Punti di Forza
        doc.setFillColor(...C_CARD);
        doc.roundedRect(M, currentY, descW, bottomH, 3, 3, 'F');
        doc.setDrawColor(...C_BORDER);
        doc.roundedRect(M, currentY, descW, bottomH, 3, 3, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isA3 ? 10 : 7.5);
        doc.setTextColor(...C_ACCENT);
        doc.text('PUNTI DI FORZA & DETTAGLI', M + (isA3 ? 6 : 4), currentY + (isA3 ? 7 : 5));

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(isA3 ? 9 : 6.8);
        doc.setTextColor(...C_MUTED);
        const rawDesc = (customText || property.description || 'Splendida soluzione immobiliare in posizione strategica a Porto Torres. Ideale per famiglie o come investimento per locazione turistica e residenziale. Ottime finiture e massima luminosità.')
            .replace(/\n+/g, ' ');
        const descLines = doc.splitTextToSize(rawDesc, descW - (isA3 ? 12 : 8));
        doc.text(descLines.slice(0, isA3 ? 5 : 4), M + (isA3 ? 6 : 4), currentY + (isA3 ? 14 : 10));

        // Box QR Code
        const qrX = PW - M - qrSize;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(qrX, currentY, qrSize, bottomH, 3, 3, 'F');
        doc.setDrawColor(...C_BORDER);
        doc.roundedRect(qrX, currentY, qrSize, bottomH, 3, 3, 'S');

        if (qrBase64) {
            const qrPadding = 2.5;
            doc.addImage(qrBase64, 'PNG', qrX + qrPadding, currentY + qrPadding, qrSize - (qrPadding * 2), qrSize - (qrPadding * 2));
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isA3 ? 6.5 : 5);
        doc.setTextColor(0, 34, 102);
        doc.text('INQUADRA CON LO SMARTPHONE', qrX + (qrSize / 2), currentY + bottomH - (isA3 ? 2.5 : 2), { align: 'center' });

        // 6. FOOTER FINALE
        const footerY = PH - (isA3 ? 10 : 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(isA3 ? 8 : 6);
        doc.setTextColor(...C_MUTED);
        doc.text('Immobiliare con Michele · www.immobiliareconmichele.it · Corso Vittorio Emanuele / Via Libio 80, Porto Torres · Tel. 334 857 6926', PW / 2, footerY, { align: 'center' });

    // =========================================================================
    // LAYOUT 2: ORIZZONTALE (LANDSCAPE) - A4 o A3
    // =========================================================================
    } else {
        const leftColW = (CW * 0.56);
        const rightColW = CW - leftColW - (isA3 ? 8 : 6);
        const rightX = M + leftColW + (isA3 ? 8 : 6);

        // 1. COLONNA SINISTRA: FOTO HERO + EVENTUALI MINIATURE
        const hasThumbs = (thumb1Base64 || thumb2Base64);
        const heroH = hasThumbs ? (PH - (M * 2) - (isA3 ? 55 : 40)) : (PH - (M * 2));

        if (heroBase64) {
            doc.addImage(heroBase64, 'JPEG', M, M, leftColW, heroH, undefined, 'FAST');
            doc.setDrawColor(...C_BORDER);
            doc.setLineWidth(0.6);
            doc.rect(M, M, leftColW, heroH, 'S');
        }

        if (hasThumbs) {
            const thumbY = M + heroH + (isA3 ? 5 : 3.5);
            const validThumbs = [thumb1Base64, thumb2Base64].filter(Boolean);
            const thumbGap = 4;
            const thumbW = (leftColW - (thumbGap * (validThumbs.length - 1))) / validThumbs.length;
            const thumbH = (PH - M) - thumbY;

            validThumbs.forEach((tb, i) => {
                const tx = M + (i * (thumbW + thumbGap));
                doc.addImage(tb, 'JPEG', tx, thumbY, thumbW, thumbH, undefined, 'FAST');
                doc.setDrawColor(...C_BORDER);
                doc.rect(tx, thumbY, thumbW, thumbH, 'S');
            });
        }

        // 2. COLONNA DESTRA: BRANDING, TITOLO, PREZZO, SPECS, QR CODE
        let rY = M;

        // Header branding
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isA3 ? 16 : 12);
        doc.setTextColor(...C_ACCENT);
        doc.text('IMMOBILIARE CON MICHELE', rightX, rY + (isA3 ? 7 : 5));

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(isA3 ? 9 : 7);
        doc.setTextColor(...C_MUTED);
        doc.text('Michele Erre · Porto Torres · Tel. 334 857 6926', rightX, rY + (isA3 ? 13 : 9.5));

        // Badge Contratto
        const badgeTxt = isLuxury ? '💎 LUXURY' : (property.status === 'Vendita' ? 'IN VENDITA' : 'IN AFFITTO');
        const badgeW = isA3 ? 45 : 32;
        const badgeH = isA3 ? 9 : 7;
        const badgeX = PW - M - badgeW;
        doc.setFillColor(...(isLuxury ? [212, 168, 83] : [0, 68, 255]));
        doc.roundedRect(badgeX, rY, badgeW, badgeH, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isA3 ? 8.5 : 6.5);
        doc.setTextColor(255, 255, 255);
        doc.text(badgeTxt, badgeX + (badgeW / 2), rY + (badgeH / 2) + 1, { align: 'center' });

        rY += (isA3 ? 20 : 15);

        // Titolo immobile
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isA3 ? 18 : 13.5);
        doc.setTextColor(...C_TEXT);
        const titleLines = doc.splitTextToSize(property.title || 'Immobile di Pregio', rightColW);
        doc.text(titleLines.slice(0, 2), rightX, rY + 4);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(isA3 ? 11 : 8.5);
        doc.setTextColor(...C_MUTED);
        doc.text(`📍 ${property.zone || 'Porto Torres'} · ${property.property_type || 'Residenziale'}`, rightX, rY + (isA3 ? 12 : 9) + (titleLines.length > 1 ? 5 : 0));

        rY += (isA3 ? 20 : 16) + (titleLines.length > 1 ? 5 : 0);

        // Box Prezzo
        const priceBoxH = isA3 ? 18 : 13;
        doc.setFillColor(...(isLuxury ? [212, 168, 83] : [0, 68, 255]));
        doc.roundedRect(rightX, rY, rightColW, priceBoxH, 2.5, 2.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isA3 ? 15 : 11.5);
        doc.setTextColor(255, 255, 255);
        const prezzoTxt = (showPrice && property.price && Number(property.price) > 0)
            ? `€ ${Number(property.price).toLocaleString('it-IT')}`
            : 'TRATTATIVA RISERVATA';
        doc.text(prezzoTxt, rightX + (rightColW / 2), rY + (priceBoxH / 2) + 1.5, { align: 'center' });

        rY += priceBoxH + (isA3 ? 8 : 5);

        // Griglia Caratteristiche (4 quadratini 2x2)
        const specs = [
            property.sqm ? `📐 ${property.sqm} MQ` : '📐 AMPIA METRATURA',
            property.rooms ? `🛏️ ${property.rooms} VANI` : '🛏️ PLURILOCALE',
            property.bathrooms ? `🚿 ${property.bathrooms} ${property.bathrooms === 1 ? 'BAGNO' : 'BAGNI'}` : '🚿 BAGNO FINESTRATO',
            property.has_parking ? '🚗 GARAGE' : '⚡ CLASSE ENERG. G'
        ];

        const gridGap = isA3 ? 4 : 3;
        const gridW = (rightColW - gridGap) / 2;
        const gridH = isA3 ? 12 : 9;

        specs.forEach((sp, i) => {
            const gx = rightX + ((i % 2) * (gridW + gridGap));
            const gy = rY + (Math.floor(i / 2) * (gridH + gridGap));
            doc.setFillColor(...C_CARD);
            doc.roundedRect(gx, gy, gridW, gridH, 2, 2, 'F');
            doc.setDrawColor(...C_BORDER);
            doc.roundedRect(gx, gy, gridW, gridH, 2, 2, 'S');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(isA3 ? 8.5 : 6.5);
            doc.setTextColor(...C_TEXT);
            doc.text(sp, gx + (gridW / 2), gy + (gridH / 2) + 1, { align: 'center' });
        });

        rY += (gridH * 2) + gridGap + (isA3 ? 8 : 5);

        // Blocco Punti di Forza + QR Code affiancati in basso a destra
        const bottomBoxH = (PH - M) - rY;
        const qrDim = bottomBoxH;
        const descPartW = rightColW - qrDim - (isA3 ? 6 : 4);

        // Descrizione
        doc.setFillColor(...C_CARD);
        doc.roundedRect(rightX, rY, descPartW, bottomBoxH, 2.5, 2.5, 'F');
        doc.setDrawColor(...C_BORDER);
        doc.roundedRect(rightX, rY, descPartW, bottomBoxH, 2.5, 2.5, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isA3 ? 9 : 7);
        doc.setTextColor(...C_ACCENT);
        doc.text('DETTAGLI & PLUS', rightX + 4, rY + (isA3 ? 6 : 4.5));

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(isA3 ? 8 : 6.2);
        doc.setTextColor(...C_MUTED);
        const rawDesc = (customText || property.description || 'Ottima opportunità immobiliare selezionata da Immobiliare con Michele. Contattaci per fissare un sopralluogo.')
            .replace(/\n+/g, ' ');
        const descLines = doc.splitTextToSize(rawDesc, descPartW - 8);
        doc.text(descLines.slice(0, isA3 ? 5 : 4), rightX + 4, rY + (isA3 ? 12 : 9));

        // QR Code
        const qrX = rightX + descPartW + (isA3 ? 6 : 4);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(qrX, rY, qrDim, bottomBoxH, 2.5, 2.5, 'F');
        doc.setDrawColor(...C_BORDER);
        doc.roundedRect(qrX, rY, qrDim, bottomBoxH, 2.5, 2.5, 'S');

        if (qrBase64) {
            const qrP = 2;
            doc.addImage(qrBase64, 'PNG', qrX + qrP, rY + qrP, qrDim - (qrP * 2), qrDim - (qrP * 2) - 3);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isA3 ? 5.5 : 4.2);
        doc.setTextColor(0, 34, 102);
        doc.text('INQUADRA IL QR', qrX + (qrDim / 2), rY + bottomH - 1.5, { align: 'center' });
    }

    return doc;
}

// Esposto su window per l'utilizzo nel pannello Admin
window.generaCartelloVetrinaPDF = generaCartelloVetrinaPDF;
