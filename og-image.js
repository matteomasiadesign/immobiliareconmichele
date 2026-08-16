/* Rigenera og-image.jpg, l'immagine che i social mostrano quando si condivide
   il link del sito.
 *
 * Non ridisegna la hero: la fotografa. Apre index.html in un browser vero a una
 * misura scelta apposta perche' la hero venga esattamente 1200x630 (il formato
 * che vogliono Facebook, WhatsApp e iMessage) e ne salva uno screenshot. Cosi'
 * quando la hero cambia l'anteprima si riallinea rilanciando questo script,
 * senza tenere in piedi una seconda copia del layout che prima o poi divergerebbe.
 *
 * Il sito resta senza build: questo script vive fuori dalle pagine e serve solo
 * a chi rigenera l'immagine. Serve Node e una copia di Chrome o Edge (su Windows
 * c'e' gia'), piu' puppeteer-core installato al momento:
 *
 *   npm install puppeteer-core
 *   node og-image.js
 *   npm uninstall puppeteer-core   # opzionale: non serve al sito
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

// La hero e' alta "100vh meno gli 80px di navbar": con 710 di viewport viene 630.
const WIDTH = 1200;
const HEIGHT = 630;
const NAVBAR = 80;

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

(async () => {
  const chrome = BROWSERS.find(p => fs.existsSync(p));
  if (!chrome) throw new Error('Nessun Chrome o Edge trovato: aggiungi il percorso in BROWSERS.');

  const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT + NAVBAR, deviceScaleFactor: 1 });

  const index = 'file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/');
  await page.goto(index, { waitUntil: 'networkidle2', timeout: 60000 });

  // Due cose vanno tolte dallo scatto: il pulsante della chat, che e' UI viva e
  // in un'immagine ferma sembra un pulsante rotto, e la sfumatura al bianco in
  // fondo alla hero, che serve a raccordarla con la sezione successiva ma qui
  // sbiadirebbe il bordo inferiore dell'anteprima.
  await page.addStyleTag({ content: `
    #fab-container, #mobile-menu { display: none !important; }
    .hero::after { display: none !important; }
  ` });

  await page.evaluate(() => document.fonts.ready);
  // L'ingresso GSAP della hero dura circa due secondi: si aspetta che si posi,
  // altrimenti si fotografano titolo e testo ancora a meta' dissolvenza.
  await new Promise(r => setTimeout(r, 3500));

  const y = await page.evaluate(() => document.querySelector('.hero').getBoundingClientRect().y);
  await page.screenshot({
    path: path.join(__dirname, 'og-image.jpg'),
    type: 'jpeg',
    // 88 tiene il file sotto i 100 KB: le anteprime con immagini pesanti a volte
    // non vengono nemmeno scaricate dai crawler.
    quality: 88,
    clip: { x: 0, y, width: WIDTH, height: HEIGHT },
  });

  await browser.close();
  console.log('og-image.jpg rigenerata (' + WIDTH + 'x' + HEIGHT + ')');
})().catch(e => { console.error('ERRORE:', e.message); process.exit(1); });
