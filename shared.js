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
      <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.327.101.148.45.712.96 1.211.66.651 1.221.852 1.369.94.148.087.235.075.321-.025.087-.1.372-.43.473-.578.101-.148.202-.124.336-.075.134.05 .85.4 1.011.477.16.077.268.115.304.177.037.062.037.347-.106.752z"></path></svg>
    </a>
    <button onclick="shareProperty('${p.id}', '${p.title.replace(/'/g, "\\'")}')" class="btn-share" title="Condividi Annuncio">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
    </button>
  `;

    document.getElementById('property-modal').style.display = 'flex';
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
    document.getElementById('property-modal').style.display = 'none';
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
