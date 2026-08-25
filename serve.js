const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.sql': 'text/plain; charset=utf-8'
};

// Client connessi per il live-reload via Server-Sent Events
let sseClients = [];

function notifyClients() {
  sseClients.forEach(client => {
    try {
      client.write('data: reload\n\n');
    } catch (e) {}
  });
}

// Watch dei file della cartella per ricaricare automaticamente al salvataggio
let debounceTimer = null;
try {
  fs.watch(PUBLIC_DIR, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    // Ignora file di git o temporanei
    if (filename.includes('.git') || filename.includes('node_modules')) return;
    
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log(`[Live Reload] File modificato: ${filename} -> Ricarico la pagina...`);
      notifyClients();
    }, 100);
  });
} catch (err) {
  console.warn('[Live Reload] Watcher warning:', err.message);
}

const LIVE_RELOAD_SNIPPET = `
<!-- Live Reload Script -->
<script>
  (function() {
    let source = new EventSource('/__live_reload');
    source.onmessage = function(e) {
      if (e.data === 'reload') {
        window.location.reload();
      }
    };
    source.onerror = function() {
      // Riconnessione automatica se il server si riavvia
      setTimeout(function() {
        source.close();
        source = new EventSource('/__live_reload');
      }, 2000);
    };
  })();
</script>
`;

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Endpoint Server-Sent Events per Live Reload
  if (pathname === '/__live_reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write('\n');
    sseClients.push(res);

    req.on('close', () => {
      sseClients = sseClients.filter(c => c !== res);
    });
    return;
  }

  if (pathname === '/') {
    pathname = '/index.html';
  } else if (pathname === '/luxury' || pathname === '/luxury/') {
    pathname = '/luxury.html';
  } else if (!path.extname(pathname) && fs.existsSync(path.join(PUBLIC_DIR, pathname + '.html'))) {
    pathname = pathname + '.html';
  }

  // Prevenzione directory traversal
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    if (stats.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      fs.stat(indexPath, (indexErr, indexStats) => {
        if (!indexErr && indexStats.isFile()) {
          serveFile(indexPath, res);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 Not Found');
        }
      });
      return;
    }

    serveFile(filePath, res);
  });
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  if (ext === '.html') {
    // Inietta il Live Reload prima della chiusura </body> o </html>
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Internal Server Error');
        return;
      }

      let content = data;
      if (content.includes('</body>')) {
        content = content.replace('</body>', `${LIVE_RELOAD_SNIPPET}</body>`);
      } else if (content.includes('</html>')) {
        content = content.replace('</html>', `${LIVE_RELOAD_SNIPPET}</html>`);
      } else {
        content += LIVE_RELOAD_SNIPPET;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    });
    return;
  }

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache'
  });

  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
    }
  });
  stream.pipe(res);
}

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`  Live Preview Server attivo!`);
  console.log(`  Home:   http://localhost:${PORT}/`);
  console.log(`  Admin:  http://localhost:${PORT}/admin.html`);
  console.log(`  Luxury: http://localhost:${PORT}/luxury`);
  console.log(`==================================================\n`);
});
