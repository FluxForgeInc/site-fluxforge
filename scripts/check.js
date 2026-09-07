#!/usr/bin/env node
/**
 * Post-build verification:
 *  (a) no references to googleapis/gstatic/googleusercontent/cdn.tailwindcss
 *  (b) exactly one <h1> per page
 *  (c) every internal link (href="/...") resolves to a file in public/
 *  (d) every <img> has alt, width and height
 *  (e) every PT source page has an EN counterpart (via its "alt" front-matter
 *      field) and vice versa, and "alt" pairs are reciprocal
 *  (f) every <link rel="alternate" hreflang="..."> in the built output
 *      resolves to a real file in public/
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const SITE_URL = 'https://fluxforge.pt';
let failures = 0;

function findFiles(dir, predicate) {
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(findFiles(full, predicate));
    else if (predicate(entry.name)) out.push(full);
  }
  return out;
}

const findHtmlFiles = (dir) => findFiles(dir, (name) => name.endsWith('.html') && !/^google[0-9a-f]+.html$/.test(name));

const files = findHtmlFiles(PUBLIC);
console.log(`Checking ${files.length} HTML files in public/...\n`);

// (a) forbidden third-party references anywhere in public/
const forbidden = /googleapis|gstatic|googleusercontent|cdn\.tailwindcss/i;
for (const file of findFiles(PUBLIC, () => true)) {
  if (!/\.(html|css|js|xml|txt|webmanifest|json)$/.test(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  if (forbidden.test(content)) {
    console.error(`[FAIL] (a) forbidden third-party reference in ${path.relative(PUBLIC, file)}`);
    failures++;
  }
}

// (b) exactly one <h1> per page, (c) internal links resolve, (d) img alt/width/height, (f) hreflang resolves
function resolvesToFile(rootRelativeHref) {
  if (rootRelativeHref.startsWith('//')) return true; // protocol-relative external
  let target = rootRelativeHref;
  if (target.endsWith('/')) target += 'index.html';
  return fs.existsSync(path.join(PUBLIC, target));
}

for (const file of files) {
  const rel = path.relative(PUBLIC, file);
  const html = fs.readFileSync(file, 'utf8');

  const h1Count = (html.match(/<h1[\s>]/g) || []).length;
  if (h1Count !== 1) {
    console.error(`[FAIL] (b) ${rel} has ${h1Count} <h1> elements (expected 1)`);
    failures++;
  }

  const linkRe = /href="(\/[^"#]*)"/g;
  let m;
  while ((m = linkRe.exec(html))) {
    const href = m[1];
    if (!resolvesToFile(href)) {
      console.error(`[FAIL] (c) ${rel} links to missing file: ${href}`);
      failures++;
    }
  }

  const imgRe = /<img\b[^>]*>/g;
  let im;
  while ((im = imgRe.exec(html))) {
    const tag = im[0];
    const hasAlt = /\balt="[^"]*"/.test(tag);
    const hasWidth = /\bwidth="\d+"/.test(tag);
    const hasHeight = /\bheight="\d+"/.test(tag);
    if (!hasAlt || !hasWidth || !hasHeight) {
      console.error(`[FAIL] (d) ${rel} has an <img> missing alt/width/height: ${tag.slice(0, 120)}`);
      failures++;
    }
  }

  // (f) every hreflang alternate link must resolve to a real output file
  const hreflangRe = /<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g;
  let hf;
  while ((hf = hreflangRe.exec(html))) {
    const [, hreflang, href] = hf;
    if (!href.startsWith(SITE_URL)) {
      console.error(`[FAIL] (f) ${rel} hreflang="${hreflang}" href is not an absolute site URL: ${href}`);
      failures++;
      continue;
    }
    const rootRelative = href.slice(SITE_URL.length) || '/';
    if (!resolvesToFile(rootRelative)) {
      console.error(`[FAIL] (f) ${rel} hreflang="${hreflang}" points to missing file: ${href}`);
      failures++;
    }
  }
}

// (e) every PT source page has an EN counterpart and vice versa, via front matter
function findPageFiles(dir) {
  return findFiles(dir, (name) => name.endsWith('.html') && !/^google[0-9a-f]+.html$/.test(name));
}

function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  const [, fmBlock] = match;
  const data = {};
  fmBlock.split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    data[key] = value;
  });
  return data;
}

const SRC_PAGES = path.join(ROOT, 'src', 'pages');
if (fs.existsSync(SRC_PAGES)) {
  const srcFiles = findPageFiles(SRC_PAGES);
  const byPath = {};
  for (const file of srcFiles) {
    const data = parseFrontMatter(fs.readFileSync(file, 'utf8'));
    if (!data || !data.path) continue;
    byPath[data.path] = { file, data };
  }

  for (const routePath of Object.keys(byPath)) {
    const { file, data } = byPath[routePath];
    const rel = path.relative(ROOT, file);

    if (routePath === '/404.html') continue; // single bilingual page, no counterpart required

    if (!data.lang || (data.lang !== 'pt' && data.lang !== 'en')) {
      console.error(`[FAIL] (e) ${rel} has missing/invalid "lang" front matter: ${data.lang}`);
      failures++;
      continue;
    }
    if (!data.alt) {
      console.error(`[FAIL] (e) ${rel} (lang=${data.lang}) has no "alt" front matter pointing to its counterpart`);
      failures++;
      continue;
    }
    const counterpart = byPath[data.alt];
    if (!counterpart) {
      console.error(`[FAIL] (e) ${rel} declares alt="${data.alt}" but no page with that path exists`);
      failures++;
      continue;
    }
    if (counterpart.data.alt !== routePath) {
      console.error(`[FAIL] (e) ${rel} <-> ${path.relative(ROOT, counterpart.file)} alt pair is not reciprocal (${counterpart.data.alt} !== ${routePath})`);
      failures++;
    }
    if (counterpart.data.lang === data.lang) {
      console.error(`[FAIL] (e) ${rel} and its alt counterpart ${path.relative(ROOT, counterpart.file)} have the same lang ("${data.lang}")`);
      failures++;
    }
  }
}

console.log('');
if (failures === 0) {
  console.log('All checks passed.');
  process.exit(0);
} else {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
