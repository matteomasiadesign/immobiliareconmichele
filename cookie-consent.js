/**
 * Cookie Consent Manager - Immobiliare con Michele
 * Conforme a GDPR (UE 2016/679), Direttiva ePrivacy e Linee Guida Garante Privacy
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'imm_cookie_consent_v1';
  const CONSENT_VERSION = '1.0';

  // Stato predefinito dei consensi
  const DEFAULT_CONSENT = {
    necessary: true,
    analytics: false,
    marketing: false,
    timestamp: null,
    version: CONSENT_VERSION
  };

  // Testi completi delle policy (utilizzati anche per il rendering rapido nelle modali)
  const POLICY_TEXTS = {
    privacy: `
      <div class="cc-policy-content">
        <p><em>Ultimo aggiornamento: Settembre 2026</em></p>
        
        <h3>1. Titolare del Trattamento</h3>
        <p>
          Il Titolare del trattamento dei dati personali è <strong>Michele Erre - Agente Immobiliare</strong><br>
          Sede operativa: Porto Torres (SS), Sardegna, Italia<br>
          P.IVA: <strong>03076110901</strong> | REA: <strong>SS - 227691</strong> | PEC: <a href="mailto:erremichele12@pec.it">erremichele12@pec.it</a><br>
          Email di contatto: <a href="mailto:infoerreimmobili@gmail.com">infoerreimmobili@gmail.com</a> | Telefono: <a href="tel:+393348576926">+39 334 857 6926</a>
        </p>

        <h3>2. Tipologie di Dati Raccolti</h3>
        <p>Nello svolgimento dell'attività di intermediazione immobiliare e tramite il presente sito web, raccogliamo:</p>
        <ul>
          <li><strong>Dati forniti volontariamente dall'utente:</strong> nome, cognome, indirizzo email, recapito telefonico, indirizzo dell'immobile, caratteristiche catastali/strutturali fornite tramite i moduli di contatto o richiesta di valutazione immobiliare.</li>
          <li><strong>Dati di navigazione e log tecnici:</strong> indirizzi IP, tipo di browser, orari di accesso, pagine visualizzate, necessari al funzionamento del sito e alla sicurezza informatica.</li>
          <li><strong>Preferenze di consenso:</strong> stato dei consensi espresso dall'utente in merito ai cookie e tecnologie similari.</li>
        </ul>

        <h3>3. Finalità e Basi Giuridiche del Trattamento</h3>
        <p>I dati personali sono trattati per le seguenti finalità:</p>
        <ul>
          <li><strong>Riscontro a richieste di informazioni e valutazione immobiliare:</strong> per fornirti la stima richiesta o rispondere ai quesiti (Base giuridica: esecuzione di misure precontrattuali o contrattuali, Art. 6.1.b GDPR).</li>
          <li><strong>Mediazione e gestione incarichi:</strong> redazione di proposte d'acquisto, incarichi di mediazione e pratiche connesse alla compravendita o locazione (Base giuridica: adempimento contrattuale e obblighi di legge, Art. 6.1.b e 6.1.c GDPR).</li>
          <li><strong>Adempimenti normativi e antiriciclaggio:</strong> ottemperanza a obblighi fiscali, contabili e di adeguata verifica della clientela (D.Lgs. 231/2007).</li>
          <li><strong>Sicurezza e manutenzione del sito:</strong> prevenzione di frodi o utilizzi impropri (Base giuridica: legittimo interesse del Titolare, Art. 6.1.f GDPR).</li>
          <li><strong>Statistiche e marketing (previo consenso):</strong> analisi anonime e comunicazioni informative (Base giuridica: consenso esplicito, Art. 6.1.a GDPR).</li>
        </ul>

        <h3>4. Modalità di Trattamento e Conservazione</h3>
        <p>Il trattamento viene svolto con strumenti informatici e telematici nel rispetto dei principi di correttezza, liceità, trasparenza e tutela della riservatezza (misure tecniche e crittografia fornite dall'infrastruttura Supabase). I dati per le richieste di valutazione vengono conservati per il tempo strettamente necessario all'evasione della pratica (massimo 24 mesi per le stime non convertite in mandato) o per 10 anni in caso di conclusione di affari ai sensi del Codice Civile.</p>

        <h3>5. Destinatari dei Dati</h3>
        <p>I dati potranno essere comunicati a soggetti terzi di cui il Titolare si avvale per l'erogazione dei servizi:</p>
        <ul>
          <li>Fornitori di servizi cloud e database (Supabase Inc., con infrastruttura conforme al GDPR e clausole contrattuali tipo SCC).</li>
          <li>Consulenti contabili, legali o notarili nei limiti necessari alle operazioni immobiliari.</li>
          <li>Autorità giudiziarie o organi di controllo in caso di obbligo di legge.</li>
        </ul>

        <h3>6. Diritti dell'Interessato (Artt. 15-22 GDPR)</h3>
        <p>Hai in qualsiasi momento il diritto di:</p>
        <ul>
          <li>Chiedere la conferma dell'esistenza dei tuoi dati e ottenerne copia (Diritto di accesso).</li>
          <li>Chiederne l'aggiornamento, la rettifica o l'integrazione.</li>
          <li>Chiederne la cancellazione («diritto all'oblio») nei casi previsti dalla legge.</li>
          <li>Revocare il consenso precedentemente accordato senza pregiudicare la liceità del trattamento anteriore.</li>
          <li>Proporre reclamo all'Autorità Garante per la Protezione dei Dati Personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener">www.garanteprivacy.it</a>).</li>
        </ul>
        <p>Per esercitare i tuoi diritti puoi scrivere all'indirizzo email: <a href="mailto:infoerreimmobili@gmail.com">infoerreimmobili@gmail.com</a> o via PEC a <a href="mailto:erremichele12@pec.it">erremichele12@pec.it</a>.</p>
      </div>
    `,
    cookie: `
      <div class="cc-policy-content">
        <p><em>Ultimo aggiornamento: Settembre 2026</em></p>

        <h3>1. Cosa sono i Cookie?</h3>
        <p>I cookie sono brevi file di testo che i siti web visitati inviano al terminale dell'utente (computer, smartphone, tablet), dove vengono memorizzati per poi essere ritrasmessi agli stessi siti alla visita successiva. Tecnologie affini comprendono il <code>localStorage</code> del browser e i pixel di tracciamento.</p>

        <h3>2. Categorie di Cookie Utilizzati</h3>
        <p>Il nostro sito web utilizza le seguenti tipologie di cookie e strumenti di archiviazione:</p>

        <table class="cc-policy-table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Nome / Chiave</th>
              <th>Fornitore</th>
              <th>Durata</th>
              <th>Finalità</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Tecnico (Necessario)</strong></td>
              <td><code>imm_cookie_consent_v1</code></td>
              <td>Proprietario (localStorage)</td>
              <td>12 mesi</td>
              <td>Memorizza la scelta di consenso espressa dall'utente in conformità al GDPR.</td>
            </tr>
            <tr>
              <td><strong>Tecnico (Necessario)</strong></td>
              <td><code>sb-*-auth-token</code></td>
              <td>Supabase</td>
              <td>Sessione / Persistente</td>
              <td>Gestione dell'autenticazione per l'area amministrativa e sicurezza delle query al database immobili.</td>
            </tr>
            <tr>
              <td><strong>Tecnico (Necessario)</strong></td>
              <td>Google Fonts (CDN)</td>
              <td>Google Ireland</td>
              <td>Sessione</td>
              <td>Visualizzazione ottimizzata dei caratteri tipografici del sito (Space Grotesk, Teko).</td>
            </tr>
            <tr>
              <td><strong>Analitici (Opzionali)</strong></td>
              <td>Cookie analitici anonimi (es. GA4)</td>
              <td>Terze parti / Proprietario</td>
              <td>Fino a 24 mesi</td>
              <td>Misurazione aggregata e anonimizzata del traffico per migliorare i servizi. <em>Attivati solo previo tuo consenso.</em></td>
            </tr>
            <tr>
              <td><strong>Marketing (Opzionali)</strong></td>
              <td>Pixel traccianti (es. Meta)</td>
              <td>Meta Platforms Inc.</td>
              <td>Fino a 12 mesi</td>
              <td>Misurazione dell'efficacia delle inserzioni e campagne promozionali immobiliari sui social. <em>Attivati solo previo tuo consenso.</em></td>
            </tr>
          </tbody>
        </table>

        <h3>3. Gestione e Revoca del Consenso</h3>
        <p>Puoi modificare o revocare il tuo consenso in qualsiasi momento cliccando sul link <strong>"Preferenze Cookie"</strong> presente nel footer di tutte le pagine del sito, oppure tramite l'icona a scudo in basso a sinistra.</p>

        <h3>4. Come Disabilitare i Cookie dal Tuo Browser</h3>
        <p>È possibile configurare il proprio browser per bloccare o cancellare i cookie. Ecco le guide ufficiali per i principali programmi di navigazione:</p>
        <ul>
          <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener">Google Chrome</a></li>
          <li><a href="https://support.apple.com/it-it/guide/safari/sfri11471/mac" target="_blank" rel="noopener">Apple Safari</a></li>
          <li><a href="https://support.mozilla.org/it/kb/Gestione%20dei%20cookie" target="_blank" rel="noopener">Mozilla Firefox</a></li>
          <li><a href="https://support.microsoft.com/it-it/windows/eliminare-e-gestire-i-cookie-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener">Microsoft Edge</a></li>
        </ul>
      </div>
    `
  };

  // Caricamento dello stato salvato
  function getStoredConsent() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('[CookieConsent] Errore lettura localStorage:', e);
    }
    return null;
  }

  // Salvataggio consenso
  function saveConsent(consent) {
    const payload = {
      necessary: true,
      analytics: Boolean(consent.analytics),
      marketing: Boolean(consent.marketing),
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('[CookieConsent] Errore salvataggio localStorage:', e);
    }
    hideBanner();
    closeSettingsModal();
    showReopenTrigger();
    dispatchConsentUpdate(payload);
    activateConsentedScripts(payload);
    return payload;
  }

  // Notifica aggiornamento consensi all'applicazione
  function dispatchConsentUpdate(consent) {
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: consent }));
  }

  // Attiva gli script condizionali basati sul consenso accordato
  // I markup degli script possono essere impostati come:
  // <script type="text/plain" data-cookie-category="analytics" src="...">
  function activateConsentedScripts(consent) {
    const scripts = document.querySelectorAll('script[type="text/plain"][data-cookie-category]');
    scripts.forEach(script => {
      const category = script.getAttribute('data-cookie-category');
      if (consent && consent[category] === true) {
        const newScript = document.createElement('script');
        // Copia attributi
        Array.from(script.attributes).forEach(attr => {
          if (attr.name !== 'type' && attr.name !== 'data-cookie-category') {
            newScript.setAttribute(attr.name, attr.value);
          }
        });
        newScript.type = 'text/javascript';
        newScript.text = script.text;
        script.parentNode.replaceChild(newScript, script);
        console.log(`[CookieConsent] Script attivato per categoria: ${category}`);
      }
    });
  }

  // Iniezione del markup HTML per Banner, Modale Preferenze, Modale Policy e Trigger Fluttuante
  function injectComponents() {
    if (document.getElementById('cc-root')) return;

    const root = document.createElement('div');
    root.id = 'cc-root';
    root.innerHTML = `
      <!-- BANNER IN BASSO (NON BLOCCANTE) -->
      <aside class="cc-banner-wrap" id="cc-banner" role="dialog" aria-labelledby="cc-title" aria-describedby="cc-desc">
        <div class="cc-banner">
          <div class="cc-banner-header">
            <div class="cc-icon-badge" aria-hidden="true">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10c0-.55-.45-1-1-1-.48 0-.91.35-.98.83-.43 3.19-3.13 5.67-6.52 5.67-3.64 0-6.6-2.96-6.6-6.6 0-3.39 2.48-6.09 5.67-6.52.48-.07.83-.5.83-.98 0-.55-.45-1-1-1zm-.5 12c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3-4c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm-6 0C7.67 10 7 9.33 7 8.5S7.67 7 8.5 7s1.5.67 1.5 1.5S9.33 10 8.5 10z"/></svg>
            </div>
            <h3 class="cc-banner-title" id="cc-title">Informativa Cookie &amp; Privacy</h3>
          </div>
          <p class="cc-banner-desc" id="cc-desc">
            Utilizziamo cookie tecnici essenziali per il funzionamento del sito e, previo tuo consenso, cookie di terze parti per analisi e marketing. Puoi accettare tutti i cookie, rifiutarli o personalizzare le tue scelte. Consulta la nostra <a href="privacy.html" data-open-modal="privacy">Privacy Policy</a> e la <a href="cookie.html" data-open-modal="cookie">Cookie Policy</a>.
          </p>
          <div class="cc-banner-actions">
            <button type="button" class="cc-btn cc-btn-accept" id="cc-btn-accept-all">Accetta tutti</button>
            <button type="button" class="cc-btn cc-btn-reject" id="cc-btn-reject-all">Rifiuta</button>
            <button type="button" class="cc-btn cc-btn-customize" id="cc-btn-customize">Personalizza</button>
          </div>
        </div>
      </aside>

      <!-- MODALE PREFERENZE / PERSONALIZZA -->
      <div class="cc-modal-backdrop" id="cc-settings-modal" role="dialog" aria-modal="true" aria-labelledby="cc-settings-title">
        <div class="cc-modal-dialog">
          <div class="cc-modal-header">
            <h3 class="cc-modal-title" id="cc-settings-title">Personalizza preferenze Cookie</h3>
            <button type="button" class="cc-modal-close" id="cc-settings-close" aria-label="Chiudi modale">
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          <div class="cc-modal-body">
            <p>I cookie ci aiutano a offrirti una navigazione ottimale. Puoi decidere liberamente quali categorie autorizzare; i cookie tecnici necessari sono sempre attivi per garantire i servizi del sito.</p>
            
            <div class="cc-categories-list">
              <!-- TECNICI -->
              <div class="cc-category-card">
                <div class="cc-category-header">
                  <div class="cc-category-info">
                    <span class="cc-category-name">Cookie Tecnici &amp; Funzionali</span>
                    <span class="cc-badge-required">Sempre attivi</span>
                  </div>
                  <label class="cc-switch">
                    <input type="checkbox" id="cc-pref-necessary" checked disabled>
                    <span class="cc-slider"></span>
                  </label>
                </div>
                <p class="cc-category-desc">Indispensabili per consentire la navigazione sicura, la memorizzazione delle tue preferenze di consenso e l'accesso al catalogo annunci e moduli di contatto.</p>
              </div>

              <!-- ANALITICI -->
              <div class="cc-category-card">
                <div class="cc-category-header">
                  <div class="cc-category-info">
                    <span class="cc-category-name">Cookie Analitici &amp; Prestazioni</span>
                  </div>
                  <label class="cc-switch">
                    <input type="checkbox" id="cc-pref-analytics">
                    <span class="cc-slider"></span>
                  </label>
                </div>
                <p class="cc-category-desc">Ci aiutano a capire come gli utenti interagiscono con il sito raccogliendo e trasmettendo informazioni in forma aggregata e anonima per migliorare i contenuti.</p>
              </div>

              <!-- MARKETING -->
              <div class="cc-category-card">
                <div class="cc-category-header">
                  <div class="cc-category-info">
                    <span class="cc-category-name">Cookie di Profilazione &amp; Marketing</span>
                  </div>
                  <label class="cc-switch">
                    <input type="checkbox" id="cc-pref-marketing">
                    <span class="cc-slider"></span>
                  </label>
                </div>
                <p class="cc-category-desc">Utilizzati per rendere gli annunci pubblicitari (ad es. su Instagram o Facebook) più pertinenti per te e misurare l'efficacia delle campagne.</p>
              </div>
            </div>
          </div>
          <div class="cc-modal-footer">
            <button type="button" class="cc-btn cc-btn-reject" id="cc-settings-reject">Rifiuta non necessari</button>
            <button type="button" class="cc-btn cc-btn-accept" id="cc-settings-save">Salva scelte</button>
          </div>
        </div>
      </div>

      <!-- MODALE VISUALIZZATORE POLICY (PRIVACY / COOKIE) -->
      <div class="cc-modal-backdrop" id="cc-policy-modal" role="dialog" aria-modal="true" aria-labelledby="cc-policy-title">
        <div class="cc-modal-dialog cc-modal-wide">
          <div class="cc-modal-header">
            <h3 class="cc-modal-title" id="cc-policy-title">Informativa</h3>
            <button type="button" class="cc-modal-close" id="cc-policy-close" aria-label="Chiudi informativa">
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          <div class="cc-modal-body" id="cc-policy-body">
            <!-- Testo iniettato dinamicamente -->
          </div>
          <div class="cc-modal-footer">
            <button type="button" class="cc-btn cc-btn-reject" id="cc-policy-done">Chiudi</button>
          </div>
        </div>
      </div>

      <!-- TRIGGER FLUTTUANTE RIAPERTURA CONSENSO (GDPR ART. 7) -->
      <button type="button" class="cc-reopen-trigger" id="cc-reopen-btn" title="Gestisci preferenze cookie" aria-label="Gestisci preferenze cookie">
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10c0-.55-.45-1-1-1-.48 0-.91.35-.98.83-.43 3.19-3.13 5.67-6.52 5.67-3.64 0-6.6-2.96-6.6-6.6 0-3.39 2.48-6.09 5.67-6.52.48-.07.83-.5.83-.98 0-.55-.45-1-1-1zm-.5 12c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3-4c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm-6 0C7.67 10 7 9.33 7 8.5S7.67 7 8.5 7s1.5.67 1.5 1.5S9.33 10 8.5 10z"/></svg>
      </button>
    `;
    document.body.appendChild(root);
  }

  // UI Handlers
  function showBanner() {
    const banner = document.getElementById('cc-banner');
    if (banner) {
      // Ritardo minimo per animazione d'ingresso pulita
      setTimeout(() => {
        banner.classList.add('cc-visible');
      }, 300);
    }
  }

  function hideBanner() {
    const banner = document.getElementById('cc-banner');
    if (banner) {
      banner.classList.remove('cc-visible');
    }
  }

  function showReopenTrigger() {
    const trigger = document.getElementById('cc-reopen-btn');
    if (trigger) {
      trigger.classList.add('cc-active');
    }
  }

  function openSettingsModal() {
    const modal = document.getElementById('cc-settings-modal');
    if (!modal) return;
    const current = getStoredConsent() || DEFAULT_CONSENT;
    const chkAnalytics = document.getElementById('cc-pref-analytics');
    const chkMarketing = document.getElementById('cc-pref-marketing');
    if (chkAnalytics) chkAnalytics.checked = Boolean(current.analytics);
    if (chkMarketing) chkMarketing.checked = Boolean(current.marketing);

    modal.classList.add('cc-active');
  }

  function closeSettingsModal() {
    const modal = document.getElementById('cc-settings-modal');
    if (modal) modal.classList.remove('cc-active');
  }

  function openPolicyModal(type) {
    const modal = document.getElementById('cc-policy-modal');
    const title = document.getElementById('cc-policy-title');
    const body = document.getElementById('cc-policy-body');
    if (!modal || !body) return;

    if (type === 'privacy') {
      title.textContent = 'Informativa Privacy (GDPR UE 2016/679)';
      body.innerHTML = POLICY_TEXTS.privacy;
    } else {
      title.textContent = 'Informativa Estesa sui Cookie';
      body.innerHTML = POLICY_TEXTS.cookie;
    }

    modal.classList.add('cc-active');
  }

  function closePolicyModal() {
    const modal = document.getElementById('cc-policy-modal');
    if (modal) modal.classList.remove('cc-active');
  }

  // Setup eventi UI
  function bindEvents() {
    // Tasti Banner
    document.getElementById('cc-btn-accept-all')?.addEventListener('click', () => {
      saveConsent({ analytics: true, marketing: true });
    });

    document.getElementById('cc-btn-reject-all')?.addEventListener('click', () => {
      saveConsent({ analytics: false, marketing: false });
    });

    document.getElementById('cc-btn-customize')?.addEventListener('click', () => {
      openSettingsModal();
    });

    // Tasti Modale Preferenze
    document.getElementById('cc-settings-close')?.addEventListener('click', closeSettingsModal);
    document.getElementById('cc-settings-reject')?.addEventListener('click', () => {
      saveConsent({ analytics: false, marketing: false });
    });
    document.getElementById('cc-settings-save')?.addEventListener('click', () => {
      const analytics = document.getElementById('cc-pref-analytics')?.checked || false;
      const marketing = document.getElementById('cc-pref-marketing')?.checked || false;
      saveConsent({ analytics, marketing });
    });

    // Tasti Modale Policy
    document.getElementById('cc-policy-close')?.addEventListener('click', closePolicyModal);
    document.getElementById('cc-policy-done')?.addEventListener('click', closePolicyModal);

    // Trigger riapertura fluttuante
    document.getElementById('cc-reopen-btn')?.addEventListener('click', openSettingsModal);

    // Chiusura al click sul backdrop
    document.getElementById('cc-settings-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'cc-settings-modal') closeSettingsModal();
    });
    document.getElementById('cc-policy-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'cc-policy-modal') closePolicyModal();
    });

    // Intercetta tutti i link che richiedono l'apertura modale o le impostazioni
    document.addEventListener('click', (e) => {
      const policyTrigger = e.target.closest('[data-open-modal]');
      if (policyTrigger) {
        e.preventDefault();
        const modalType = policyTrigger.getAttribute('data-open-modal');
        openPolicyModal(modalType);
        return;
      }

      const manageTrigger = e.target.closest('#manage-cookies-link, .manage-cookies-trigger');
      if (manageTrigger) {
        e.preventDefault();
        openSettingsModal();
      }
    });

    // Chiusura tramite tasto ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSettingsModal();
        closePolicyModal();
      }
    });
  }

  // Inizializzazione al DOM ready
  function init() {
    injectComponents();
    bindEvents();

    const stored = getStoredConsent();
    if (!stored) {
      showBanner();
    } else {
      showReopenTrigger();
      activateConsentedScripts(stored);
      dispatchConsentUpdate(stored);
    }
  }

  // Esposizione API Globale
  window.CookieConsent = {
    getConsent: getStoredConsent,
    hasConsent: function (category) {
      const current = getStoredConsent();
      return current ? Boolean(current[category]) : false;
    },
    onConsent: function (category, callback) {
      if (typeof callback !== 'function') return;
      const current = getStoredConsent();
      if (current && current[category] === true) {
        callback();
      }
      window.addEventListener('cookieConsentUpdated', (e) => {
        if (e.detail && e.detail[category] === true) {
          callback();
        }
      });
    },
    openSettings: openSettingsModal,
    openPolicy: openPolicyModal,
    acceptAll: function () {
      return saveConsent({ analytics: true, marketing: true });
    },
    rejectAll: function () {
      return saveConsent({ analytics: false, marketing: false });
    },
    reset: function () {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

