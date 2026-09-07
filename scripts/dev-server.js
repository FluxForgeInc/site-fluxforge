#!/usr/bin/env node
/**
 * Tiny static file server for local preview of public/, mirroring the
 * clean-URL rewrite that the CloudFront function (deploy/cloudfront-function-clean-urls.js)
 * performs in production: /x -> /x/index.html, /x/ -> /x/index.html.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function resolveFile(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p === '/') p = '/index.html';
  const direct = path.join(ROOT, p);

  // Exact file exists (has an extension and is on disk)
  if (path.extname(p) && fs.existsSync(direct) && fs.statSync(direct).isFile()) {
    return direct;
  }
  // Clean URL: /x or /x/ -> /x/index.html
  const asDir = path.join(ROOT, p, 'index.html');
  if (fs.existsSync(asDir)) return asDir;

  // /x (no trailing slash, no extension) -> /x/index.html as well
  if (!path.extname(p)) {
    const noSlash = path.join(ROOT, p + '/index.html');
    if (fs.existsSync(noSlash)) return noSlash;
  }
  return null;
}

const server = http.createServer((req, res) => {
  const file = resolveFile(req.url);
  if (file) {
    const ext = path.extname(file);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
    return;
  }
  const notFound = path.join(ROOT, '404.html');
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  if (fs.existsSync(notFound)) fs.createReadStream(notFound).pipe(res);
  else res.end('404 Not Found');
});

server.listen(PORT, () => {
  console.log(`FluxForge dev server running at http://localhost:${PORT}/`);
});
