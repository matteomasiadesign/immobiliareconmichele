/*
 * Logica condivisa tra le pagine pubbliche (index.html, catalogo.html):
 * client Supabase, menu mobile, FAB, modale dettaglio annuncio + carosello, condivisione.
 * Ogni pagina definisce la propria funzione di rendering della griglia annunci
 * (renderVetrina / renderGrid) e la chiama dopo aver caricato `properties`.
 */

const SUPABASE_URL = "https://svdfgejkjvkbajmqoqjz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_aGoAYeXnUtVMe4bIc20wIQ_2EM4LTSG";
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

// Markup della card annuncio, condiviso tra la vetrina (index.html) e il
// catalogo (catalogo.html). Al passaggio del mouse mostra la seconda foto
// (se presente) invece della prima, per un effetto dinamico senza dover
// caricare l'embed di Instagram per ogni annuncio.
function propertyCardHTML(p) {
    const images = p.images || [];
    return `
    <div class="card" onclick="openModal('${p.id}')">
      <div class="card-img-container">
        <span class="card-badge-contract ${p.status === 'Vendita' ? 'vendita' : 'affitto'}">In ${p.status}</span>
        ${p.reel_url ? `<a href="${p.reel_url}" target="_blank" onclick="event.stopPropagation()" class="card-badge-reel" title="Guarda il Reel">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
        </a>` : ''}
        <img src="${images[0] || ''}" class="card-img card-img-primary" alt="Foto">
        ${images.length > 1 ? `<img src="${images[1]}" class="card-img card-img-hover" alt="Foto">` : ''}
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
        </div>
        <div class="card-footer">
          <div>
            <span class="card-price-label">Prezzo</span>
            <span class="card-price">€${p.price.toLocaleString('it-IT')}</span>
          </div>
          <span class="card-cta">Scopri
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
          </span>
        </div>
      </div>
    </div>`;
}

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
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
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

// Effetto "magnetico": il bottone segue leggermente il cursore entro un
// piccolo raggio e torna al centro quando il mouse esce. Solo su dispositivi
// con puntatore preciso (mouse/trackpad): su touch non ha alcun effetto.
function initMagneticButtons(selector = '.magnetic') {
    if (!motionOK || !window.matchMedia('(pointer: fine)').matches) return;
    document.querySelectorAll(selector).forEach(el => {
        const moveX = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' });
        const moveY = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' });
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            moveX((e.clientX - rect.left - rect.width / 2) * 0.35);
            moveY((e.clientY - rect.top - rect.height / 2) * 0.35);
        });
        el.addEventListener('mouseleave', () => { moveX(0); moveY(0); });
    });
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

    const cards = document.querySelectorAll(selector);

    cards.forEach((card, index) => {
        if (card.dataset.cardAnimated) return;
        card.dataset.cardAnimated = '1';
        
        gsap.from(card, {
            opacity: 0,
            y: 40,
            rotation: 1,
            duration: 0.7,
            delay: index * 0.08,
            ease: 'back.out(1.2)',
            scrollTrigger: {
                trigger: card.parentElement,
                start: 'top 80%',
                markers: false
            }
        });
    });
    ScrollTrigger.refresh();
}

initMagneticButtons();
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

// GESTIONE HAMBURGER MENU
const mobileToggle = document.getElementById('mobile-toggle');
const mobileMenu = document.getElementById('mobile-menu');
mobileToggle.addEventListener('click', () => { mobileMenu.classList.toggle('open'); });
mobileMenu.querySelectorAll('a').forEach(link => { link.addEventListener('click', () => mobileMenu.classList.remove('open')); });

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
    document.getElementById('mod-rooms').innerText = p.rooms + " Stanze";
    document.getElementById('mod-bathrooms').innerText = p.bathrooms + " Bagni";
    const modGrid = document.getElementById('mod-grid');
    const sqmItem = document.getElementById('mod-sqm-item');
    if (p.sqm) { document.getElementById('mod-sqm').innerText = p.sqm + " m²"; sqmItem.style.display = ''; modGrid.classList.add('has-sqm'); }
    else { sqmItem.style.display = 'none'; modGrid.classList.remove('has-sqm'); }
    document.getElementById('mod-parking').innerText = p.has_parking ? "Sì" : "No";
    document.getElementById('mod-desc').innerText = p.description;
    document.getElementById('mod-price').innerText = "€" + p.price.toLocaleString('it-IT') + (p.status === 'Affitto' ? " /mese" : "");

    const actionsContainer = document.getElementById('mod-actions-container');
    actionsContainer.innerHTML = `
    <a href="tel:+393348576926" class="btn-call">CHIAMA ORA</a>
    ${p.reel_url ? `
    <a href="${p.reel_url}" target="_blank" class="btn-reel">
      <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
    </a>` : ''}
    <a href="https://wa.me/393348576926" target="_blank" class="btn-wa">
      <svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/></svg>
    </a>
    <button onclick="shareProperty('${p.id}', '${p.title.replace(/'/g, "\\'")}')" class="btn-share" title="Condividi Annuncio">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
    </button>
  `;

    showModal();
}

function showModal() {
    const overlay = document.getElementById('property-modal');
    const card = overlay.querySelector('.modal-card');
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
    const dotsContainer = document.getElementById('mod-img-dots');

    if (!currentModalImages || currentModalImages.length === 0) {
        imgEl.src = '';
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        dotsContainer.innerHTML = '';
        return;
    }

    if (motionOK) {
        gsap.fromTo(imgEl, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power1.out' });
    }
    imgEl.src = currentModalImages[currentImageIndex];

    if (currentModalImages.length > 1) {
        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';
        dotsContainer.innerHTML = currentModalImages.map((_, i) =>
            `<div class="gallery-dot ${i === currentImageIndex ? 'active' : ''}" onclick="goToImage(${i})"></div>`
        ).join('');
    } else {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        dotsContainer.innerHTML = '';
    }
}

function nextImage() {
    if (currentModalImages.length <= 1) return;
    currentImageIndex = (currentImageIndex + 1) % currentModalImages.length;
    updateModalImage();
}

function prevImage() {
    if (currentModalImages.length <= 1) return;
    currentImageIndex = (currentImageIndex - 1 + currentModalImages.length) % currentModalImages.length;
    updateModalImage();
}

function goToImage(index) {
    if (index < 0 || index >= currentModalImages.length) return;
    currentImageIndex = index;
    updateModalImage();
}

function closeModal() {
    const overlay = document.getElementById('property-modal');
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
