#!/usr/bin/env node
/**
 * Build script: assembles pages from src/pages + src/partials into public/,
 * copies static assets, generates SEO files, then runs the Tailwind CLI to
 * compile the final minified stylesheet.
 *
 * Bilingual site: Portuguese (default, root) and English (under /en/).
 * Every page's front matter carries `lang: pt|en` and `alt: <path>` pointing
 * to its counterpart in the other language. Partials are per-language
 * (src/partials/pt/*, src/partials/en/*); head.html is shared and
 * parameterised with lang-specific placeholders.
 *
 * Usage: node build.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const PUBLIC = path.join(ROOT, 'public');
const ASSETS_SRC = path.join(ROOT, 'assets');
const SITE_URL = 'https://fluxforge.pt';
const TODAY = new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/* Per-language static strings                                         */
/* ------------------------------------------------------------------ */
const I18N = {
  pt: {
    htmlLang: 'pt-PT',
    ogLocale: 'pt_PT',
    ogLocaleAlt: 'en_GB',
    skipLink: 'Saltar para o conteúdo principal',
    breadcrumbHome: 'Início',
  },
  en: {
    htmlLang: 'en',
    ogLocale: 'en_GB',
    ogLocaleAlt: 'pt_PT',
    skipLink: 'Skip to main content',
    breadcrumbHome: 'Home',
  },
};

// The two home-page routes get the ProfessionalService JSON-LD block.
const HOME_PATHS = ['/', '/en/'];

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
function rimraf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

function writeFile(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error('missing front matter');
  const [, fmBlock, content] = match;
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
  return { data, content: content.trim() };
}

function template(str, vars) {
  return str.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in vars ? vars[key] : ''));
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}

// Normalise a route path the same way for both canonical URLs and hreflang
// URLs: trailing slash unless it's the one path that ends in .html (404).
function urlFor(routePath) {
  return SITE_URL + routePath.replace(/\/?$/, routePath.endsWith('.html') ? '' : '/');
}

/* ------------------------------------------------------------------ */
/* Find all page source files (including nested dirs like legal/, en/) */
/* ------------------------------------------------------------------ */
function findPageFiles(dir) {
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(findPageFiles(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 1. Clean public/                                                    */
/* ------------------------------------------------------------------ */
rimraf(PUBLIC);
fs.mkdirSync(PUBLIC, { recursive: true });

/* ------------------------------------------------------------------ */
/* 2. Copy static assets (fonts, images, icon sprite, logos, favicons)  */
/* ------------------------------------------------------------------ */
if (fs.existsSync(ASSETS_SRC)) {
  for (const entry of fs.readdirSync(ASSETS_SRC, { withFileTypes: true })) {
    const src = path.join(ASSETS_SRC, entry.name);
    if (entry.isDirectory()) {
      // top-level asset folders (fonts, img) go under public/assets/<name>
      copyDir(src, path.join(PUBLIC, 'assets', entry.name));
    } else if (['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'og-image.png'].includes(entry.name)) {
      // root-level generated raster images live at the site root
      fs.copyFileSync(src, path.join(PUBLIC, entry.name));
    } else {
      // svg logos, icons.svg, favicon.svg etc. live under public/assets/
      fs.copyFileSync(src, path.join(PUBLIC, 'assets', entry.name));
    }
  }
}

/* ------------------------------------------------------------------ */
/* 3. Copy main.js                                                     */
/* ------------------------------------------------------------------ */
writeFile(path.join(PUBLIC, 'assets', 'js', 'main.js'), readFile(path.join(SRC, 'js', 'main.js')));

/* ------------------------------------------------------------------ */
/* 4. Load partials                                                    */
/* ------------------------------------------------------------------ */
const headPartial = readFile(path.join(SRC, 'partials', 'head.html'));
const headerPartials = {
  pt: readFile(path.join(SRC, 'partials', 'pt', 'header.html')),
  en: readFile(path.join(SRC, 'partials', 'en', 'header.html')),
};
const footerPartials = {
  pt: readFile(path.join(SRC, 'partials', 'pt', 'footer.html')),
  en: readFile(path.join(SRC, 'partials', 'en', 'footer.html')),
};

/* ------------------------------------------------------------------ */
/* 5. Parse all pages                                                   */
/* ------------------------------------------------------------------ */
const pageFiles = findPageFiles(path.join(SRC, 'pages'));
const pages = pageFiles.map((file) => {
  const raw = readFile(file);
  const { data, content } = parseFrontMatter(raw);
  if (!data.lang) throw new Error(`${file}: missing "lang" in front matter`);
  return { file, data, content };
});

// Every page except 404.html gets a canonical entry in the sitemap
// (6 PT + 6 EN primary routes + 2 PT legal + 2 EN legal = 16 URLs).
const sitemapPages = pages.filter((p) => p.data.path !== '/404.html');

/* ------------------------------------------------------------------ */
/* 6. Render each page                                                 */
/* ------------------------------------------------------------------ */
for (const page of pages) {
  const { data, content } = page;
  const lang = data.lang;
  const i18n = I18N[lang];
  const canonicalPath = data.path;
  const canonicalUrl = urlFor(canonicalPath);
  const robots = data.noindex ? 'noindex, follow' : 'index, follow';

  // hreflang alternates: skip entirely for pages with no "alt" (404).
  let hreflangLinks = '';
  if (data.alt) {
    const altUrl = urlFor(data.alt);
    const ptUrl = lang === 'pt' ? canonicalUrl : altUrl;
    const enUrl = lang === 'en' ? canonicalUrl : altUrl;
    hreflangLinks = [
      `<link rel="alternate" hreflang="pt-PT" href="${ptUrl}">`,
      `<link rel="alternate" hreflang="en" href="${enUrl}">`,
      `<link rel="alternate" hreflang="x-default" href="${ptUrl}">`,
    ].join('\n');
  }

  // Extra JSON-LD: ProfessionalService on the two home pages, BreadcrumbList on inner pages.
  let jsonLdExtra = '';
  if (HOME_PATHS.includes(canonicalPath)) {
    jsonLdExtra = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "name": "FluxForge",
  "url": "${canonicalUrl}",
  "image": "${SITE_URL}/assets/og-image.png",
  "email": "contacto@fluxforge.pt",
  "areaServed": "PT",
  "priceRange": "€€€",
  "description": "${escapeAttr(data.description)}"
}
</script>`;
  } else if (data.breadcrumb && !data.noindex) {
    jsonLdExtra = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "${i18n.breadcrumbHome}", "item": "${urlFor(lang === 'pt' ? '/' : '/en/')}" },
    { "@type": "ListItem", "position": 2, "name": "${data.breadcrumb}", "item": "${canonicalUrl}" }
  ]
}
</script>`;
  }

  const head = template(headPartial, {
    TITLE: data.title,
    DESCRIPTION: data.description,
    CANONICAL: canonicalUrl,
    ROBOTS: robots,
    OG_LOCALE: i18n.ogLocale,
    OG_LOCALE_ALT: i18n.ogLocaleAlt,
    HREFLANG_LINKS: hreflangLinks,
    JSONLD_EXTRA: jsonLdExtra,
  });

  // Mark the active nav link (desktop + mobile) via each link's data-path attribute.
  let header = template(headerPartials[lang], { ALT_PATH: data.alt || (lang === 'pt' ? '/en/' : '/') });
  if (data.navKey && data.navKey !== 'none') {
    header = header.replace(
      new RegExp(`(class="[^"]*)(nav-link(?:-mobile)?)([^"]*")([^>]*data-path="${data.navKey}")`, 'g'),
      (m, pre, navCls, clsRest, tail) => {
        const isMobile = navCls.includes('mobile');
        const extra = isMobile
          ? ' text-primary-container font-semibold'
          : ' text-primary-container font-semibold border-b-2 border-primary-container pb-1';
        return `${pre}${navCls}${clsRest.slice(0, -1)}${extra}"${tail} aria-current="page"`;
      }
    );
  }

  const footer = template(footerPartials[lang], { ALT_PATH: data.alt || (lang === 'pt' ? '/en/' : '/') });

  const html = `<!doctype html>
<html lang="${i18n.htmlLang}">
<head>
${head}
</head>
<body class="bg-surface-canvas font-body-base text-on-surface antialiased" data-lang="${lang}">
<a class="skip-link" href="#main-content">${i18n.skipLink}</a>
${header}
<main id="main-content" tabindex="-1" class="w-full bg-surface-canvas">
${content}
</main>
${footer}
<script src="/assets/js/main.js" defer></script>
</body>
</html>
`;

  // Resolve output file path.
  let outFile;
  if (canonicalPath.endsWith('.html')) {
    outFile = path.join(PUBLIC, canonicalPath.replace(/^\//, ''));
  } else {
    outFile = path.join(PUBLIC, canonicalPath.replace(/^\//, ''), 'index.html');
  }
  writeFile(outFile, html);
  console.log('wrote', path.relative(PUBLIC, outFile));
}

/* ------------------------------------------------------------------ */
/* 7. robots.txt / sitemap.xml / site.webmanifest                       */
/* ------------------------------------------------------------------ */
writeFile(
  path.join(PUBLIC, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
);

const urlEntries = sitemapPages
  .map((p) => {
    const { data } = p;
    const lang = data.lang;
    const selfUrl = urlFor(data.path);
    const altUrl = data.alt ? urlFor(data.alt) : null;
    const ptUrl = lang === 'pt' ? selfUrl : altUrl;
    const enUrl = lang === 'en' ? selfUrl : altUrl;
    const altLinks = altUrl
      ? [
          `    <xhtml:link rel="alternate" hreflang="pt-PT" href="${ptUrl}"/>`,
          `    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>`,
          `    <xhtml:link rel="alternate" hreflang="x-default" href="${ptUrl}"/>`,
        ].join('\n')
      : '';
    return `  <url>\n    <loc>${selfUrl}</loc>\n    <lastmod>${TODAY}</lastmod>\n${altLinks ? altLinks + '\n' : ''}  </url>`;
  })
  .join('\n');
writeFile(
  path.join(PUBLIC, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urlEntries}\n</urlset>\n`
);

// GitHub Pages: custom domain + disable Jekyll processing
writeFile(path.join(PUBLIC, 'CNAME'), 'fluxforge.pt\n');
writeFile(path.join(PUBLIC, '.nojekyll'), '');

writeFile(
  path.join(PUBLIC, 'site.webmanifest'),
  JSON.stringify(
    {
      name: 'FluxForge',
      short_name: 'FluxForge',
      start_url: '/',
      display: 'browser',
      background_color: '#FCF8FF',
      theme_color: '#5B3FE4',
      icons: [
        { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
    },
    null,
    2
  )
);

/* ------------------------------------------------------------------ */
/* 8. Compile Tailwind CSS (minified) from src/styles.css               */
/* ------------------------------------------------------------------ */
console.log('Running Tailwind CLI...');
execSync(
  `npx tailwindcss -i "${path.join(SRC, 'styles.css')}" -o "${path.join(PUBLIC, 'assets', 'css', 'styles.css')}" --config "${path.join(ROOT, 'tailwind.config.js')}" --minify`,
  { stdio: 'inherit', cwd: ROOT }
);

console.log('\nBuild complete ->', PUBLIC);
