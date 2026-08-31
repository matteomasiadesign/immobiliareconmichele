/*
 * Logica condivisa tra le pagine pubbliche (index.html, catalogo.html):
 * client Supabase, menu mobile, FAB, modale dettaglio annuncio + carosello, condivisione.
 * Ogni pagina definisce la propria funzione di rendering della griglia annunci
 * (renderVetrina / renderGrid) e la chiama dopo aver caricato `properties`.
 */

// SUPABASE_URL e SUPABASE_ANON_KEY arrivano da config.js, incluso prima di questo file.
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let properties = [];
let currentModalImages = [];
let currentImageIndex = 0;

// Sfugge i caratteri HTML pericolosi nei dati provenienti dal database
// prima di inserirli in innerHTML, per evitare XSS.
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// Il cambio foto al passaggio del mouse esiste solo dove c'e' un mouse.
// Su telefono la seconda immagine non si vedrebbe mai, ma verrebbe comunque
// scaricata scorrendo il catalogo: qui la si salta del tutto, che su una
// connessione mobile vuol dire meta' delle foto da caricare.
const hoverOK = typeof window.matchMedia === 'function'
    ? window.matchMedia('(hover: hover)').matches
    : true;

// Markup della card annuncio, condiviso tra la vetrina (index.html) e il
// catalogo (catalogo.html). Al passaggio del mouse mostra la seconda foto
// (se presente) invece della prima, per un effetto dinamico senza dover
// caricare l'embed di Instagram per ogni annuncio.
function propertyCardHTML(p) {
    const images = p.images || [];
    const isReserved = !p.price || Number(p.price) <= 0;
    const priceDisplay = isReserved ? 'Trattativa riservata' : `€${Number(p.price).toLocaleString('it-IT')}`;
    return `
    <div class="card" data-id="${escapeHtml(p.id)}">
      <div class="card-img-container">
        <span class="card-badge-contract ${p.status === 'Vendita' ? 'vendita' : 'affitto'}">In ${escapeHtml(p.status)}</span>
        <div class="card-badges">
          ${p.reel_url ? `<a href="${escapeHtml(p.reel_url)}" target="_blank" rel="noopener" class="card-badge-reel" title="Guarda il Reel" aria-label="Guarda il Reel su Instagram">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          </a>` : ''}
          <button type="button" class="card-badge-share" title="Condividi questo annuncio" aria-label="Condividi questo annuncio">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
          </button>
        </div>
        <img src="${escapeHtml(images[0] || '')}" class="card-img card-img-primary" alt="${escapeHtml(p.title)}">
        ${hoverOK && images.length > 1 ? `<img src="${escapeHtml(images[1])}" class="card-img card-img-hover" alt="" loading="lazy">` : ''}
      </div>
      <div class="card-content">
        <span style="font-size:11px; font-weight:900; color:var(--brand-blue); text-transform:uppercase;">${escapeHtml(p.property_type)}</span>
        <h3 class="card-title">${escapeHtml(p.title)}</h3>
        <div class="card-zone">
          <svg style="width: 14px; height: 14px; flex-shrink: 0;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          ${escapeHtml(p.zone)}
        </div>
        <div class="card-features">
          <span class="feature-item"><svg style="width: 12px; height: 12px; flex-shrink: 0;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg> ${p.rooms} Locali</span>
          <span class="feature-item"><svg style="width: 12px; height: 12px; flex-shrink: 0;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg> ${p.bathrooms} Bagni</span>
          ${p.sqm ? `<span class="feature-item"><svg style="width: 12px; height: 12px; flex-shrink: 0;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"></path></svg> ${p.sqm} m²</span>` : ''}
          ${p.energy_class && p.energy_class !== 'In fase di definizione' ? `<span class="feature-item" title="Classe Energetica ${escapeHtml(p.energy_class)}"><svg style="width: 12px; height: 12px; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> ${escapeHtml(p.energy_class)}</span>` : ''}
        </div>
        <div class="card-footer">
          <div>
            <span class="card-price-label">Prezzo</span>
            <span class="card-price" ${isReserved ? 'style="font-size:1.05rem; font-weight:800;"' : ''}>${priceDisplay}</span>
          </div>
          <span class="card-cta">Scopri
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
          </span>
        </div>
      </div>
    </div>`;
}

// Apertura della scheda annuncio: un solo listener sul documento invece di un
// onclick su ogni card. Dentro l'attributo il browser decodifica le entita'
// PRIMA di eseguire il codice, quindi un titolo o un id con un apice potevano
// spezzare la chiamata; con data-id il valore resta un dato e non diventa mai
// codice. Vale anche per le card generate dopo (griglia filtrata, ricerca).
// I due badge sulla foto (Reel e condividi) sono dentro la card ma hanno una
// loro azione: si intercettano PRIMA e si esce, altrimenti il clic risalirebbe
// fino alla card e aprirebbe anche la scheda. Si controllano qui invece che con
// un event.stopPropagation() su ciascun badge perche' il listener e' uno solo:
// l'ordine dei controlli e' gia' la precedenza, e non serve codice negli attributi.
document.addEventListener('click', (e) => {
    if (e.target.closest('.card-badge-reel')) return;

    const shareBtn = e.target.closest('.card-badge-share');
    if (shareBtn) {
        const id = shareBtn.closest('.card[data-id]')?.dataset.id;
        const p = properties.find(x => x.id === id);
        if (p) shareProperty(p.id, p.title);
        return;
    }

    const card = e.target.closest('.card[data-id]');
    if (card) openModal(card.dataset.id);
});

// --- ANIMAZIONI (GSAP) ---
// motionOK è false solo se GSAP non è disponibile (es. CDN/file irraggiungibile):
// in quel caso tutte le funzioni sotto diventano no-op e il contenuto resta
// quello visibile via HTML/CSS normale, senza mai restare nascosto.
const motionOK = typeof gsap !== 'undefined';

if (motionOK) gsap.registerPlugin(ScrollTrigger);

// --- SMOOTH SCROLL (Lenis) ---
// Rende lo scroll fluido/inerziale invece del salto 1:1 con la rotellina.
// Va agganciato al ticker di GSAP (non a requestAnimationFrame proprio)
// e ScrollTrigger va avvisato ad ogni suo scroll simulato, altrimenti le
// animazioni legate allo scroll restano ancorate alla posizione nativa.
let lenis = null;
if (motionOK && typeof Lenis !== 'undefined') {
    // allowNestedScroll: senza, Lenis intercetta OGNI evento della rotellina
    // (anche del trackpad) e ci fa lo scroll verticale della pagina, chiamando
    // preventDefault: i contenitori scrollabili interni, come il carosello
    // "In Evidenza" della home, non ricevevano mai il gesto orizzontale e la
    // componente verticale del dito finiva per far scivolare la pagina in su.
    // Con l'opzione attiva Lenis controlla se sotto al puntatore c'e' un
    // elemento che puo' davvero scorrere in quella direzione e in quel caso
    // si tira indietro, lasciando fare al browser.
    lenis = new Lenis({ duration: 1.1, smoothWheel: true, allowNestedScroll: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // I link "#id" (menu, bottoni "Scopri di più", ecc.) devono scorrere
    // in modo fluido tramite Lenis invece del salto nativo del browser,
    // altrimenti si vedrebbe un'incoerenza tra i due comportamenti.
    // L'offset -100 replica lo scroll-margin-top delle sezioni (navbar fissa).
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link || link.getAttribute('href') === '#') return;
        const target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -100 });
    });
}

// Rivela con un leggero fade+slide dal basso gli elementi che entrano nel
// viewport durante lo scroll. Richiamabile più volte in sicurezza (es. dopo
// il render dinamico delle card): gli elementi già rivelati non vengono
// ri-animati.
function initScrollReveals(selector = '.reveal') {
    if (!motionOK) return;
    document.querySelectorAll(selector).forEach(el => {
        if (el.dataset.revealed) return;
        el.dataset.revealed = '1';
        gsap.from(el, {
            opacity: 0, y: 28, duration: 0.7, ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 88%' }
        });
    });
    ScrollTrigger.refresh();
}

// Navbar più compatta e con ombra più marcata dopo un piccolo scroll.
// Non dipende da GSAP/motionOK: non è "movimento" in senso stretto (nessuna
// grande animazione), solo un cambio di stato in base allo scroll, quindi
// deve funzionare anche con "riduci animazioni" attivo o se il CDN di GSAP
// non si carica.
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

// Parallax del contenuto hero durante lo scroll per un effetto di profondità.
// Il testo e i bottoni si muovono lentamente verso l'alto mentre l'utente scrolla.
function initHeroParallax() {
    if (!motionOK) return;
    if (window.innerWidth < 992) return;
    const heroContent = document.querySelector('.hero-content');
    if (!heroContent) return;

    gsap.to(heroContent, {
        y: 80,
        opacity: 0.7,
        scrollTrigger: {
            trigger: '.hero',
            start: 'top top',
            end: 'bottom top',
            scrub: 0.8,
            markers: false
        }
    });
}

// Animazioni per le sezioni: fade-in staggered quando entrano nel viewport.
// Ogni sezione si rivela con un fade elegante dal basso.
function initSectionAnimations() {
    if (!motionOK) return;

    const sections = document.querySelectorAll('.section, .servizi-band');

    sections.forEach((section, index) => {
        if (section.dataset.sectionAnimated) return;
        section.dataset.sectionAnimated = '1';
        
        gsap.from(section, {
            opacity: 0,
            y: 50,
            duration: 0.9,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: section,
                start: 'top 75%',
                end: 'top 25%',
                scrub: false,
                markers: false
            }
        });
    });
    ScrollTrigger.refresh();
}

// Effetto stagger sofisticato sui card: ogni card si rivela con un piccolo
// ritardo, creando un effetto "onda" da sinistra a destra.
function initCardStagger(selector = '.card') {
    if (!motionOK) return;

    // Pulisce i ScrollTrigger la cui card animata è ormai fuori dal DOM.
    // renderGrid()/renderVetrina() rimpiazzano la griglia con innerHTML a ogni
    // cambio filtro/slider e richiamano questa funzione: il "trigger" di ogni
    // ScrollTrigger è il contenitore (card.parentElement), che resta sempre
    // nel DOM, quindi va controllato il target dell'animazione (la card
    // stessa) e non il trigger. Senza questa pulizia ogni render aggiunge
    // nuovi trigger senza mai rimuovere i vecchi, con un leak che cresce a
    // ogni interazione nella stessa sessione di navigazione.
    ScrollTrigger.getAll().forEach(st => {
        const targets = st.animation ? st.animation.targets() : [];
        if (targets.length && targets.every(t => !t.isConnected)) {
            st.animation.kill();
            st.kill();
        }
    });

    const isMobile = window.innerWidth < 768;
    const cards = document.querySelectorAll(selector);

    cards.forEach((card, index) => {
        if (card.dataset.cardAnimated) return;
        card.dataset.cardAnimated = '1';
        
        gsap.from(card, {
            opacity: 0,
            y: isMobile ? 12 : 36,
            duration: isMobile ? 0.45 : 0.7,
            delay: isMobile ? 0 : index * 0.08,
            ease: isMobile ? 'power2.out' : 'back.out(1.2)',
            scrollTrigger: {
                trigger: card.parentElement,
                start: 'top 85%',
                markers: false
            }
        });
    });
    ScrollTrigger.refresh();
}

initNavbarScroll();

// Inizializza le animazioni quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initHeroParallax();
        initSectionAnimations();
        initCardStagger();
    });
} else {
    initHeroParallax();
    initSectionAnimations();
    initCardStagger();
}

// GESTIONE HAMBURGER MENU MORFICO
const mobileToggle = document.getElementById('mobile-toggle');
const mobileMenu = document.getElementById('mobile-menu');

function setMobileMenu(open) {
    if (!mobileMenu || !mobileToggle) return;
    mobileMenu.classList.toggle('open', open);
    mobileToggle.classList.toggle('is-active', open);
    mobileToggle.setAttribute('aria-expanded', String(open));
    mobileToggle.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
}
if (mobileToggle) {
    mobileToggle.addEventListener('click', () => setMobileMenu(!mobileMenu.classList.contains('open')));
}
if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(link => { link.addEventListener('click', () => setMobileMenu(false)); });
}
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu && mobileMenu.classList.contains('open')) {
        setMobileMenu(false);
        if (mobileToggle) mobileToggle.focus();
    }
});

// Evidenzia nella navbar la pagina in cui ci si trova
function initCurrentPageNav() {
    const clean = (s) => s.split('#')[0].split('/').pop().replace(/\.html$/, '') || 'index';
    const current = clean(location.pathname);
    document.querySelectorAll('.drawer-nav-item, .mobile-menu a').forEach(a => {
        const href = a.getAttribute('href') || '';
        if (!href || href.startsWith('#') || /^(https?:|tel:|mailto:)/.test(href)) return;
        if (clean(href) !== current) return;
        a.classList.add('is-current');
        a.setAttribute('aria-current', 'page');
    });
}
initCurrentPageNav();

// GESTIONE FLOATING MENU
function toggleFab() {
    document.getElementById('fab-menu').classList.toggle('open');
    document.getElementById('fab-container').classList.toggle('active');
}

function openModal(id) {
    const p = properties.find(x => x.id === id);
    if (!p) return;

    currentModalImages = p.images || [];
    currentImageIndex = 0;
    updateModalImage();

    document.getElementById('mod-type').innerText = p.property_type;
    document.getElementById('mod-title').innerText = p.title;
    document.getElementById('mod-zone').innerText = p.zone;
    // Solo il numero: l'unita' di misura sta nell'etichetta sotto (Locali,
    // Bagni) o nel markup accanto al valore (m²). Scriverla anche qui la
    // faceva comparire due volte, e al plurale pure quando era uno solo.
    document.getElementById('mod-rooms').innerText = p.rooms;
    document.getElementById('mod-bathrooms').innerText = p.bathrooms;
    const modGrid = document.getElementById('mod-grid');
    const sqmItem = document.getElementById('mod-sqm-item');
    if (p.sqm) { document.getElementById('mod-sqm').innerText = p.sqm; sqmItem.style.display = ''; modGrid.classList.add('has-sqm'); }
    else { sqmItem.style.display = 'none'; modGrid.classList.remove('has-sqm'); }
    document.getElementById('mod-parking').innerText = p.has_parking ? "Sì" : "No";

    // Classe Energetica & IPE
    const energyEl = document.getElementById('mod-energy-class');
    const energyItem = document.getElementById('mod-energy-item');
    const energySub = document.getElementById('mod-energy-sub');
    if (energyEl && energyItem) {
        const eClass = p.energy_class || 'In fase di definizione';
        energyEl.innerText = (eClass === 'In fase di definizione') ? 'In def.' : eClass;
        energyEl.className = 'modal-grid-number';
        if (energySub) {
            energySub.innerText = p.energy_performance ? p.energy_performance : 'Classe APE';
        }
    }

    document.getElementById('mod-desc').innerText = p.description || '';
    const isReserved = !p.price || Number(p.price) <= 0;
    document.getElementById('mod-price').innerText = isReserved
        ? "Trattativa riservata"
        : ("€" + Number(p.price).toLocaleString('it-IT') + (p.status === 'Affitto' ? " /mese" : ""));

    const actionsContainer = document.getElementById('mod-actions-container');
    actionsContainer.innerHTML = `
    <a href="tel:+393348576926" class="btn-call">CHIAMA ORA</a>
    ${p.reel_url ? `
    <a href="${escapeHtml(p.reel_url)}" target="_blank" rel="noopener" class="btn-reel">
      <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
    </a>` : ''}
    <a href="https://wa.me/393348576926" target="_blank" class="btn-wa">
      <svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/></svg>
    </a>
    <button type="button" class="btn-share" title="Condividi Annuncio">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
    </button>
  `;

    // Listener agganciato qui invece di un onclick="shareProperty('${...}')":
    // il titolo di un annuncio puo' contenere apici o virgolette, che dentro
    // l'attributo troncavano la chiamata (o rompevano il markup della modale).
    actionsContainer.querySelector('.btn-share')
        .addEventListener('click', () => shareProperty(p.id, p.title));

    initModalCarouselTouch();
    showModal();
}

function showModal() {
    const overlay = document.getElementById('property-modal');
    if (!overlay) return;
    const card = overlay.querySelector('.modal-card');
    const scrollEl = overlay.querySelector('.modal-scroll');
    if (scrollEl) scrollEl.scrollTop = 0;

    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();

    if (motionOK) {
        gsap.set(overlay, { display: 'flex' });
        gsap.fromTo(card, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' });
    } else {
        overlay.style.display = 'flex';
    }
}

function updateModalImage() {
    const imgEl = document.getElementById('mod-img');
    const prevBtn = document.getElementById('mod-prev-img');
    const nextBtn = document.getElementById('mod-next-img');
    const zoomBtn = document.getElementById('mod-zoom-btn');
    const dotsContainer = document.getElementById('mod-img-dots');

    if (!currentModalImages || currentModalImages.length === 0) {
        if (imgEl) imgEl.src = '';
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (zoomBtn) zoomBtn.style.display = 'none';
        if (dotsContainer) dotsContainer.innerHTML = '';
        return;
    }

    if (motionOK && imgEl) {
        gsap.fromTo(imgEl, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power1.out' });
    }
    if (imgEl) imgEl.src = currentModalImages[currentImageIndex];
    if (zoomBtn) zoomBtn.style.display = 'flex';

    if (currentModalImages.length > 1) {
        if (prevBtn) prevBtn.style.display = 'flex';
        if (nextBtn) nextBtn.style.display = 'flex';
        if (dotsContainer) {
            dotsContainer.innerHTML = currentModalImages.map((_, i) =>
                `<div class="gallery-dot ${i === currentImageIndex ? 'active' : ''}" onclick="goToImage(${i}, event)"></div>`
            ).join('');
        }
    } else {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (dotsContainer) dotsContainer.innerHTML = '';
    }
}

function nextImage(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (currentModalImages.length <= 1) return;
    currentImageIndex = (currentImageIndex + 1) % currentModalImages.length;
    updateModalImage();
}

function prevImage(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (currentModalImages.length <= 1) return;
    currentImageIndex = (currentImageIndex - 1 + currentModalImages.length) % currentModalImages.length;
    updateModalImage();
}

function goToImage(index, e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (index < 0 || index >= currentModalImages.length) return;
    currentImageIndex = index;
    updateModalImage();
}

function closeModal() {
    closeLightbox();
    document.body.style.overflow = '';
    if (lenis) lenis.start();

    const overlay = document.getElementById('property-modal');
    if (!overlay) return;
    const card = overlay.querySelector('.modal-card');
    if (motionOK) {
        gsap.to(card, {
            opacity: 0, scale: 0.96, duration: 0.25, ease: 'power1.in',
            onComplete: () => { overlay.style.display = 'none'; gsap.set(card, { clearProps: 'opacity,scale' }); }
        });
    } else {
        overlay.style.display = 'none';
    }
}

// Chiusura al tocco sullo sfondo della modale
document.addEventListener('click', (e) => {
    const overlay = document.getElementById('property-modal');
    if (overlay && overlay.style.display !== 'none' && e.target === overlay) {
        closeModal();
    }
});

// GESTIONE SWIPE TOUCH SCREEN (MOBILE)
function attachSwipeListeners(element, onSwipeLeft, onSwipeRight, onSwipeDown) {
    if (!element) return;
    let startX = 0, startY = 0, currentX = 0, currentY = 0, startTime = 0;
    let isTracking = false;

    element.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        currentX = startX;
        currentY = startY;
        startTime = Date.now();
        isTracking = true;
    }, { passive: true });

    element.addEventListener('touchmove', (e) => {
        if (!isTracking || e.touches.length !== 1) return;
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
        if (!isTracking) return;
        isTracking = false;
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX > 35 && absX > absY) {
            if (deltaX < 0) {
                if (typeof onSwipeLeft === 'function') onSwipeLeft();
            } else {
                if (typeof onSwipeRight === 'function') onSwipeRight();
            }
        } else if (deltaY > 60 && absY > absX && typeof onSwipeDown === 'function') {
            onSwipeDown();
        }
    }, { passive: true });
}

function initModalCarouselTouch() {
    const containers = document.querySelectorAll('.modal-carousel-container');
    containers.forEach(container => {
        if (container.dataset.swipeInit) return;
        container.dataset.swipeInit = '1';
        attachSwipeListeners(container, () => nextImage(), () => prevImage());
    });
}

// FULLSCREEN LIGHTBOX (INGRANDIMENTO FOTO)
function ensureLightboxDOM() {
    if (document.getElementById('photo-lightbox')) return;
    const div = document.createElement('div');
    div.id = 'photo-lightbox';
    div.className = 'lightbox-overlay';
    div.style.display = 'none';
    div.innerHTML = `
      <div class="lightbox-topbar">
        <div id="lightbox-counter" class="lightbox-counter">1 / 1</div>
        <button class="lightbox-btn-close" onclick="closeLightbox()" aria-label="Chiudi ingrandimento">
          <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="lightbox-stage" id="lightbox-stage">
        <button id="lightbox-prev" class="lightbox-nav-btn prev" onclick="prevLightboxImage(event)" aria-label="Foto precedente">
          <svg width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div class="lightbox-img-wrapper" id="lightbox-img-wrapper">
          <img id="lightbox-img" src="" alt="Foto ingrandita" class="lightbox-img">
        </div>
        <button id="lightbox-next" class="lightbox-nav-btn next" onclick="nextLightboxImage(event)" aria-label="Foto successiva">
          <svg width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
      <div class="lightbox-bottom">
        <div class="lightbox-hint">Trascina per scorrere • Tocca per chiudere</div>
      </div>
    `;
    document.body.appendChild(div);

    div.addEventListener('click', (e) => {
        if (e.target === div || e.target.id === 'lightbox-stage' || e.target.id === 'lightbox-img-wrapper' || e.target.classList.contains('lightbox-bottom')) {
            closeLightbox();
        }
    });

    const stage = document.getElementById('lightbox-stage');
    if (stage) {
        attachSwipeListeners(stage, nextLightboxImage, prevLightboxImage, closeLightbox);
    }
}

function openLightbox(index = 0) {
    if (!currentModalImages || currentModalImages.length === 0) return;
    ensureLightboxDOM();
    currentImageIndex = (index >= 0 && index < currentModalImages.length) ? index : 0;
    updateLightboxImage();
    const lb = document.getElementById('photo-lightbox');
    lb.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function updateLightboxImage() {
    const img = document.getElementById('lightbox-img');
    const counter = document.getElementById('lightbox-counter');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    if (!img || !currentModalImages || currentModalImages.length === 0) return;

    if (motionOK) {
        gsap.fromTo(img, { opacity: 0.4, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.2, ease: 'power1.out' });
    }
    img.src = currentModalImages[currentImageIndex];
    if (counter) counter.innerText = `${currentImageIndex + 1} / ${currentModalImages.length}`;

    if (currentModalImages.length > 1) {
        if (prevBtn) prevBtn.style.display = 'flex';
        if (nextBtn) nextBtn.style.display = 'flex';
    } else {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
    }

    updateModalImage();
}

function nextLightboxImage(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!currentModalImages || currentModalImages.length <= 1) return;
    currentImageIndex = (currentImageIndex + 1) % currentModalImages.length;
    updateLightboxImage();
}

function prevLightboxImage(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!currentModalImages || currentModalImages.length <= 1) return;
    currentImageIndex = (currentImageIndex - 1 + currentModalImages.length) % currentModalImages.length;
    updateLightboxImage();
}

function closeLightbox() {
    const lb = document.getElementById('photo-lightbox');
    if (lb) lb.style.display = 'none';
    const modal = document.getElementById('property-modal');
    if (!modal || modal.style.display === 'none') {
        document.body.style.overflow = '';
    }
}

// Navigazione da tastiera globale per modale e lightbox
document.addEventListener('keydown', (e) => {
    const lightbox = document.getElementById('photo-lightbox');
    if (lightbox && lightbox.style.display !== 'none') {
        if (e.key === 'Escape') closeLightbox();
        else if (e.key === 'ArrowRight') nextLightboxImage();
        else if (e.key === 'ArrowLeft') prevLightboxImage();
    } else {
        const modal = document.getElementById('property-modal');
        if (modal && modal.style.display !== 'none') {
            if (e.key === 'Escape') closeModal();
            else if (e.key === 'ArrowRight') nextImage();
            else if (e.key === 'ArrowLeft') prevImage();
        }
    }
});

function shareProperty(id, title) {
    const url = window.location.origin + window.location.pathname + '?id=' + id;
    const shareData = {
        title: 'Michele Erre',
        text: 'Guarda questo immobile: ' + title,
        url: url
    };

    if (navigator.share) {
        navigator.share(shareData).catch(console.error);
    } else {
        navigator.clipboard.writeText(url).then(() => {
            alert("Link dell'annuncio copiato negli appunti!");
        });
    }
}

// ==========================================================================
// GESTIONE RICERCA RAPIDA & FILTRI NAVBAR
// ==========================================================================

function openNavSearch(e) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    
    // Chiudi il menu mobile se aperto
    const mMenu = document.getElementById('mobile-menu');
    if (mMenu && mMenu.classList.contains('open')) {
        if (typeof setMobileMenu === 'function') {
            setMobileMenu(false);
        } else {
            mMenu.classList.remove('open');
        }
    }
    
    const overlay = document.getElementById('nav-search-modal');
    if (!overlay) {
        console.error('nav-search-modal non trovato nel DOM');
        return;
    }

    try {
        populateNavSearchOptions();
    } catch (err) {
        console.warn('Errore popolamento opzioni:', err);
    }

    overlay.style.display = 'flex';
    const card = overlay.querySelector('.nav-search-modal-card');
    if (motionOK && card && typeof gsap !== 'undefined') {
        gsap.fromTo(card, { opacity: 0, y: -20, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' });
    }

    const inputQ = document.getElementById('nav-search-q');
    if (inputQ) {
        setTimeout(() => inputQ.focus(), 150);
    }
}

function closeNavSearch() {
    const overlay = document.getElementById('nav-search-modal');
    if (!overlay) return;
    const card = overlay.querySelector('.nav-search-modal-card');
    if (motionOK) {
        gsap.to(card, {
            opacity: 0, y: -15, scale: 0.97, duration: 0.2, ease: 'power1.in',
            onComplete: () => { overlay.style.display = 'none'; gsap.set(card, { clearProps: 'opacity,y,scale' }); }
        });
    } else {
        overlay.style.display = 'none';
    }
}

function handleNavSearchOverlayClick(e) {
    if (e.target.id === 'nav-search-modal') {
        closeNavSearch();
    }
}

function selectNavStatus(btn) {
    const container = document.getElementById('nav-search-status-pills');
    if (!container) return;
    container.querySelectorAll('.nav-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const hidden = document.getElementById('nav-search-status');
    if (hidden) hidden.value = btn.dataset.value;
}

function resetNavSearch() {
    const qEl = document.getElementById('nav-search-q');
    if (qEl) qEl.value = '';
    
    const firstPill = document.querySelector('#nav-search-status-pills .nav-pill[data-value="Tutti"]');
    if (firstPill) selectNavStatus(firstPill);
    
    const zoneEl = document.getElementById('nav-search-zone');
    if (zoneEl) zoneEl.value = 'Tutte';
    
    const typeEl = document.getElementById('nav-search-type');
    if (typeEl) typeEl.value = 'Tutte';
    
    const priceEl = document.getElementById('nav-search-price');
    if (priceEl) priceEl.value = '0';
}

function populateNavSearchOptions() {
    if (!properties || properties.length === 0) return;
    
    const zoneEl = document.getElementById('nav-search-zone');
    const typeEl = document.getElementById('nav-search-type');
    if (!zoneEl || !typeEl) return;

    const currentZone = zoneEl.value;
    const currentType = typeEl.value;

    const dbZones = [...new Set(properties.map(p => p.zone ? p.zone.trim() : ''))].filter(Boolean);
    const dbTypes = [...new Set(properties.map(p => p.property_type ? p.property_type.trim() : ''))].filter(Boolean);

    const defaultZones = ['Porto Torres', 'Sassari', 'Stintino', 'Sorso', 'Alghero', 'Castelsardo'];
    const allZones = [...new Set([...defaultZones, ...dbZones])].sort();

    const defaultTypes = ['Appartamento', 'Villa', 'Attico', 'Indipendente', 'Locale Commerciale', 'Terreno'];
    const allTypes = [...new Set([...defaultTypes, ...dbTypes])].sort();

    if (zoneEl.options.length <= 1) {
        zoneEl.innerHTML = '<option value="Tutte">Qualsiasi zona</option>';
        allZones.forEach(z => {
            const opt = document.createElement('option');
            opt.value = z;
            opt.textContent = z;
            zoneEl.appendChild(opt);
        });
        if (currentZone && zoneEl.querySelector(`option[value="${currentZone}"]`)) zoneEl.value = currentZone;
    }

    if (typeEl.options.length <= 1) {
        typeEl.innerHTML = '<option value="Tutte">Qualsiasi tipologia</option>';
        allTypes.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            typeEl.appendChild(opt);
        });
        if (currentType && typeEl.querySelector(`option[value="${currentType}"]`)) typeEl.value = currentType;
    }
}

function handleNavSearchSubmit(e) {
    e.preventDefault();
    const q = (document.getElementById('nav-search-q')?.value || '').trim();
    const status = document.getElementById('nav-search-status')?.value || 'Tutti';
    const zone = document.getElementById('nav-search-zone')?.value || 'Tutte';
    const type = document.getElementById('nav-search-type')?.value || 'Tutte';
    const price = Number(document.getElementById('nav-search-price')?.value) || 0;

    // Se siamo già in catalogo.html, applichiamo subito i filtri
    const isCatalog = location.pathname.includes('catalogo');
    if (isCatalog && typeof renderGrid === 'function') {
        closeNavSearch();
        
        const catalogSearch = document.getElementById('search-text');
        const catalogStatus = document.getElementById('filter-status');
        const catalogZone = document.getElementById('filter-zone');
        const catalogType = document.getElementById('filter-type');
        const catalogPriceMax = document.getElementById('price-max');

        if (catalogSearch) catalogSearch.value = q;
        if (catalogStatus) catalogStatus.value = status;
        if (catalogZone && catalogZone.querySelector(`option[value="${zone}"]`)) catalogZone.value = zone;
        if (catalogType && catalogType.querySelector(`option[value="${type}"]`)) catalogType.value = type;
        if (catalogPriceMax && price > 0) {
            catalogPriceMax.value = price;
            if (typeof updatePriceUI === 'function') updatePriceUI();
        }

        renderGrid();

        const gridEl = document.getElementById('properties-grid');
        if (gridEl) {
            if (typeof lenis !== 'undefined' && lenis) {
                lenis.scrollTo(gridEl, { offset: -120 });
            } else {
                gridEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        return;
    }

    // Reindirizziamo al catalogo con i parametri
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status && status !== 'Tutti') params.set('status', status);
    if (zone && zone !== 'Tutte') params.set('zone', zone);
    if (type && type !== 'Tutte') params.set('type', type);
    if (price > 0) params.set('priceMax', price);

    const queryString = params.toString();
    window.location.href = 'catalogo.html' + (queryString ? '?' + queryString : '');
}

// Chiusura con tasto Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const navSearchModal = document.getElementById('nav-search-modal');
        if (navSearchModal && navSearchModal.style.display !== 'none' && getComputedStyle(navSearchModal).display !== 'none') {
            closeNavSearch();
        }
    }
});

// Listener di sicurezza al caricamento del DOM
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-search-trigger, .nav-mobile-search-btn, .mobile-menu-search-btn').forEach(el => {
        el.addEventListener('click', (e) => openNavSearch(e));
    });
});
