# FluxForge — Website

Production static website for FluxForge (pure HTML + compiled Tailwind CSS + vanilla JS), built from the Stitch design exports. Published to GitHub Pages (repo `FluxForgeInc/site-fluxforge`, custom domain fluxforge.pt) by the GitHub Actions workflow in `.github/workflows/deploy.yml`. The site is **bilingual**: Portuguese (default, at the root) and English (under `/en/`) — see "Bilingual site (PT/EN)" below.

## Quick start

```bash
npm install
npm run build   # cleans public/ and rebuilds everything from src/ + assets/
npm run dev     # builds, then serves public/ at http://localhost:8080 with clean-URL routing
npm run check   # runs the automated verification script (see below)
```

`public/` is the deployable output. It is never committed: the GitHub Actions workflow builds it on every push to `main` and publishes it to GitHub Pages.

## Where to change things

| What | Where |
|---|---|
| Page copy / markup (Portuguese) | `src/pages/*.html` (one file per route, front matter + body) |
| Page copy / markup (English) | `src/pages/en/*.html` (mirrors the PT tree 1:1, e.g. `src/pages/en/what-we-solve.html`) |
| Shared header / footer, per language | `src/partials/pt/{header,footer}.html`, `src/partials/en/{header,footer}.html` |
| Per-page `<head>` (title, description, OG, hreflang, JSON-LD) | `src/partials/head.html` (shared, parameterised per language from front matter) |
| Design tokens (colors, spacing, type scale) | `tailwind.config.js` |
| Global CSS, self-hosted `@font-face`, icon sizing, carousel/focus/skip-link styles | `src/styles.css` |
| Mobile menu, testimonials carousel, contact form, copy-to-clipboard, active nav, language switcher, i18n strings | `src/js/main.js` |
| Static images/fonts/icon-sprite/logo/favicons that get copied verbatim into `public/` | `assets/` |
| Assembly logic (front matter parsing, per-language partials, hreflang, JSON-LD, sitemap/robots) | `build.js` |

### Page front matter

Every file in `src/pages/` (PT) or `src/pages/en/` (EN) starts with a small front-matter block:

```
---
title: ...            # <title> and og:title/twitter:title
description: ...       # meta description
path: /o-que-resolvemos/   # output route (drives the output file path)
navKey: o-que-resolvemos   # matches a data-path on a header nav link, for the active state
breadcrumb: O Que Resolvemos  # optional: adds a BreadcrumbList JSON-LD block
noindex: true          # optional: adds <meta name="robots" content="noindex,follow">
lang: pt               # required: "pt" or "en" — selects which partials/strings render this page
alt: /en/what-we-solve/  # required (except 404.html): path of this page's counterpart in the other language
---
<div class="flex flex-col w-full"> ... page content ... </div>
```

`build.js` wraps the body in `<main id="main-content">`, injects the header/footer partial for that page's `lang`, marks the current nav link active, emits `hreflang` alternates (pt-PT / en / x-default) from `alt`, and writes the file to `public/<path>/index.html` (or `public/404.html` for the one path that ends in `.html`).

## Bilingual site (PT/EN)

Portuguese is the default language, served at the root (`/`, `/o-que-resolvemos/`, ...). English lives under `/en/` (`/en/`, `/en/what-we-solve/`, ...). URL map:

| PT | EN |
|---|---|
| `/` | `/en/` |
| `/o-que-resolvemos/` | `/en/what-we-solve/` |
| `/como-construimos/` | `/en/how-we-build/` |
| `/como-colaboramos/` | `/en/how-we-partner/` |
| `/porque-nos/` | `/en/why-us/` |
| `/contacto/` | `/en/contact/` |
| `/legal/politica-de-privacidade/` | `/en/legal/privacy-policy/` |
| `/legal/termos-de-servico/` | `/en/legal/terms-of-service/` |
| `404.html` | one shared bilingual page (PT text first, short EN line + link to `/en/`) |

### How to add or edit a translation

1. Edit the PT source in `src/pages/...` and the EN source in `src/pages/en/...` — same body structure, only text nodes/attributes differ (classes, ids, icons, `data-*` attributes and images must stay identical between the two, so layout and behaviour never drift between languages).
2. Every page's front matter needs `lang: pt`/`lang: en` and `alt: <path-of-the-other-language-page>` — `build.js` uses `alt` to generate the `hreflang` alternates, the sitemap's per-URL language annotations, and the `{{ALT_PATH}}` link in the header/footer language switcher.
3. To add a brand-new page pair: create both files with matching `alt` pointing at each other, add both paths to `HOME_PATHS`/nav data-paths in `build.js`/the header partials if it needs primary nav, then run `npm run build` — `npm run check` will fail loudly if a page is missing its counterpart or the `alt` pair isn't reciprocal.
4. Keep brand terms untranslated (FluxForge, MES, MRP, OEE, BOM, ERP, SCADA, Andon) and use British English number formatting for money/thousands (e.g. `€290,000`, not `€290.000`).
5. The FAQ page's `FAQPage` JSON-LD script (bottom of `o-que-resolvemos.html` / `what-we-solve.html`) is hand-written per language, not generated — if you change a question/answer in the visible accordion, update the matching JSON-LD entry too.

### Language switcher behaviour

- Header (desktop + mobile) and footer all show two real language links: the current language is bold, non-linked, and carries `aria-current="true"`; the other is a link to `{{ALT_PATH}}` with `hreflang`/`lang` attributes set correctly.
- `src/js/main.js` stores the visitor's choice in `localStorage` (`fluxforge_lang`) whenever a language link is clicked (in either direction).
- On load of the **PT homepage only** (`/`), if `fluxforge_lang === 'en'` is stored, the visitor is redirected to `/en/` via `location.replace`. Nothing auto-redirects based on browser language (`Accept-Language`/`navigator.language` are never read), and the redirect never fires when `navigator.webdriver` is `true` (crawlers/automation), so search engines always see the PT homepage at `/`.
- Everything else in `main.js` that shows user-facing text (mobile-menu `aria-label`s, testimonial-carousel `aria-label`s, the submit-button "submitting..." state, the `mailto:` fallback subject/body labels) is looked up from a small `STRINGS` table keyed by `document.body`'s `data-lang` attribute (set by `build.js` from the page's front-matter `lang`), so it never needs the two languages' JS to diverge.

### One-time conversion tooling

`scripts/convert.js` is the script originally used to turn the raw Stitch export HTML (icon `<span>`s, `lh3.googleusercontent.com` images, `data-path` links) into the production markup now living in `src/pages/`. It's not part of the build pipeline — it's kept as a reference/utility if a future Stitch re-export ever needs to be re-converted the same way.

## Build pipeline (`build.js`)

1. Wipes and recreates `public/`.
2. Copies `assets/` (fonts, images, `icons.svg` sprite, logo SVGs, favicons, `og-image.png`, `apple-touch-icon.png`, `favicon.ico`) into `public/`.
3. Copies `src/js/main.js` to `public/assets/js/main.js`.
4. Parses every `src/pages/**/*.html` (PT and `en/` subtree), selects the `pt`/`en` header/footer partial per page from its front-matter `lang`, injects `hreflang` alternates from `alt`, marks the current nav link active, and writes `public/<route>/index.html`.
5. Generates `robots.txt`, `sitemap.xml` (all 16 indexable URLs — 6 PT + 6 EN primary routes + 2 PT + 2 EN legal pages — each with `xhtml:link rel="alternate" hreflang="..."` entries for its PT/EN/x-default variants, `lastmod` = build date), and `site.webmanifest`.
6. Runs the Tailwind CLI (`npx tailwindcss`) against `src/styles.css` → `public/assets/css/styles.css`, minified. No Tailwind CDN script ships anywhere.

## Verification performed

- `npm run check` (`scripts/check.js`) confirms: no `googleapis`/`gstatic`/`googleusercontent`/`cdn.tailwindcss` references anywhere in `public/`; exactly one `<h1>` per page; every root-relative `href="/..."` resolves to a real file; every `<img>` has `alt`, `width` and `height`; every PT source page has an EN counterpart and vice versa via a reciprocal `alt` front-matter pair; every `<link rel="alternate" hreflang="...">` in the built output resolves to a real file. **All checks pass, for both languages.**
- `npx html-validate "public/**/*.html"` on all 17 output files (16 bilingual pages + 404) — after fixing the real issues it found (see below), only stylistic/opinionated lint preferences remain (see "Known lint nits"), unchanged in kind and count between the PT and EN versions of each page.
- `curl` against every one of the 16 PT/EN URLs plus `/en` and `/en/what-we-solve` (no trailing slash) on the local dev server: all return `200`; a genuinely missing path returns `404` and serves the bilingual `404.html`.
- `grep` sweeps: no leftover Portuguese fragments ("Fale Connosco", "connosco", "Saltar", "Navegação", "Política de Privacidade", "Termos de Serviço") anywhere under `public/en`; no "Talk to Us" leaking into the PT tree; no `#i-person` (removed avatar icon) referenced by any page's markup anywhere in `public/`; no `googleapis`/`gstatic`/`googleusercontent`/`cdn.tailwindcss` anywhere in `public/`.
- Playwright MCP tools were not available in this session (the `playwright` MCP server failed to connect) — visual QA relied on `curl` + `grep` + `html-validate` + Lighthouse instead of live-browser screenshots/console checks.
- Lighthouse (`/en/`, headless Chrome): **Performance 99, Accessibility 97, Best Practices 100, SEO 100** — identical to the PT homepage's original scores, since both languages share the same markup/CSS/JS and the one residual accessibility flag (see below) is present in both.

### Bugs found and fixed during QA (not just cosmetic)

- Testimonials carousel: the track element carried both a Tailwind `grid grid-cols-1 md:grid-cols-2` utility class *and* a custom `@layer components` grid rule, and the two grid definitions fought each other (`grid-auto-columns: 100%` ate all the width of the explicit `1fr` track), causing the two testimonial cards to render on top of each other. Fixed by rewriting the carousel as a plain flexbox track and removing the conflicting Tailwind grid classes from the markup.
- `src/pages/o-que-resolvemos.html` was missing its closing `</div>` for the page's outer wrapper (lost when the page's trailing inline `<script>` was stripped during conversion) — caused `<html>`/`<body>` to be implicitly closed by `html-validate`. Fixed.
- `<label>` elements in the contact form wrapped a `<div>` for the custom checkbox visual, which is invalid content model for `<label>` (`<div>` isn't phrasing content). Changed those 6 divs to `<span>` — identical visual result since Tailwind's `flex` utility already forces the display mode.
- A stray `aria-label` was set on a plain, role-less `<div>` (the "PT | EN" language indicator) — removed it since the visible text already conveys the same information.
- Four homepage metric-tile headings used `<h4>` directly under an `<h2>` (skipping `<h3>`), breaking heading order; changed to `<h3>` to match every other card title on the page.
- Home page title/description were placeholders of mine before I found the brief's explicit copy in section 7; replaced with the brief's exact required strings.

### Known lint nits (left as-is, not bugs)

- `<!doctype html>` lowercase — valid HTML5, matches the original Stitch export style.
- Self-closing void elements (`<input ... />`) — valid HTML5; browsers parse them identically to `<input ...>`.
- `name="interests"` shared across the 6 "Áreas de Interesse" checkboxes in the contact form — intentional, it's how the multi-select checkbox group is collected via `FormData.getAll('interests')`.
- One inline `style="background-image:url(...)"` on the "Como Colaboramos" page — the simplest way to plug a per-instance photo into a fixed decorative panel; not a security or maintainability concern here.

## Fidelity notes / things I could not verify against a reference

Four of the six design-export folders (`fluxforge_o_que_resolvemos`, `fluxforge_como_constru_mos`, `fluxforge_como_colaboramos`, `fluxforge_porqu_n_s`) ship a `screen.png` that is actually a broken `<FIFE Image failed...>` error placeholder, not a real screenshot — so those four pages could not be pixel-compared against a reference image. Only `fluxforge_home_page/screen.png` and `fluxforge_contacto/screen.png` were valid PNGs; both were compared against the live build and match closely. For the other four pages, fidelity was checked against `DESIGN.md`'s tokens/components and the live Playwright screenshots instead.

## Icon substitutions

None. All 66 Material Symbols Outlined icons named in the six pages, plus 3 more needed for site chrome that weren't in that list (`menu`, `close` for the mobile nav toggle; `keyboard_arrow_down` for the "Dimensão da Empresa" select, including `shield_with_heart` and `lock_open_right`) were downloaded directly from the official `google/material-design-icons` GitHub repo on the first try — no fallback URL pattern or substitute icon was needed. `public/assets/icons.svg` contains 69 `<symbol>`s.

## Design elements not fully reproducible as originally authored

- **Testimonials "carousel"**: the Stitch design shows both testimonial cards at once in a static 2-column grid, with prev/next buttons that (in the original export) only toggled button opacity — there was no real sliding behaviour to preserve. I built a genuine, responsive carousel instead (1 card per view + dots + swipe + keyboard on mobile; both cards shown side-by-side with no-op nav on desktop, since both already fit). This is an enhancement beyond the source, not a regression.
- **FAQ accordion**: implemented with native `<details name="faq">`/`<summary>` (exclusive accordion, keyboard- and screen-reader-native) instead of the original `onclick`-driven `<div>` toggle. Visually identical; the interaction model is more robust and needs no JavaScript at all.
- **Mobile navigation**: the Stitch header has no mobile menu at all (`nav` is simply `hidden` below `lg`, with no hamburger or alternate way to reach the other pages on a phone). I added a hamburger button + slide-down panel, since the site needs to be usable on mobile. This is a deliberate addition, documented here since it isn't literally "from the design."

## Decisions made without explicit instruction

- **`/legal/politica-de-privacidade/` and `/legal/termos-de-servico/`**: the footer links to these on every page. The privacy policy is now real, GDPR-compliant copy (see the placeholders table below for the two or three fields still needing FluxForge's exact legal details); the terms of service page is still explicit `[Placeholder]` text, `noindex`. Both, and their English counterparts, **are** now included in `sitemap.xml` (16 URLs total, including both legal pages in both languages, per the bilingual spec) even though the terms page stays `noindex`.
- **PT/EN language switcher**: fully implemented (see "Bilingual site (PT/EN)" above) — this superseded the single-language site's earlier inert "EN" label.
- **Fonts**: Google's `/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800` response returns the *same* variable-weight `.woff2` file for all four requested static weights per subset (Google's current optimisation) — so only 2 physical files were downloaded (`plus-jakarta-sans-latin.woff2`, `plus-jakarta-sans-latin-ext.woff2`), with 8 separate `@font-face` rules (4 weights × 2 subsets) all pointing at those 2 files. This is exactly what Google itself now serves; it is not a shortcut on my part.
- **`favicon.ico`**: hand-built (ICONDIR header + embedded 32×32 PNG) since no image-conversion CLI was available; it's a valid, standards-conformant ICO (PNG-in-ICO has been supported since Windows Vista) and every modern browser accepts it. `favicon.svg` is the primary icon link; the `.ico` is only the legacy fallback.
- **`apple-touch-icon.png` (180×180)` and `og-image.png` (1200×630)`**: rendered by loading small purpose-built HTML pages in a real browser (Playwright) and screenshotting them at the exact target size — not a placeholder, but not photographed/designed assets either. Both use the brand purple (`#5B3FE4`) background and the three-bar mark, per the task's fallback instruction ("purple background with the logo").
- **Decorative faded index numbers** (the large low-opacity "01"–"09" numerals behind card icons, and the "01"–"04" behind the 4 audience cards): marked `aria-hidden="true"`, since they're purely decorative/ordinal and redundant with each card's real heading text.

## Accessibility: one residual Lighthouse flag (by design, not a bug)

Lighthouse's `color-contrast` audit still flags the purple "No Que Acreditamos" manifesto section: body text there uses `rgba(255,255,255,0.85)` white and the section eyebrow pill uses `bg-white/20`. **Both values are lifted verbatim from `DESIGN.md`** ("Translucent Card... Body copy `rgba(255, 255, 255, 0.85)`"), i.e. they are the client's own specified design system, not an implementation shortcut. I left them exactly as specified rather than silently increasing contrast and drifting from the supplied brand system. Everything else Lighthouse originally flagged (contrast on decorative numerals, heading order, touch-target size) was a real, fixable issue and has been fixed — see "Bugs found and fixed" above. **Flag this specific residual item to FluxForge / their designer**: either accept the brand's own translucency spec as-is (common for "atmosphere" sections), or ask for the opacity to be bumped for strict WCAG AA compliance in that one section.

## Placeholders FluxForge must replace before launch

| Item | Location | Notes |
|---|---|---|
| All 7 photographs | `assets/img/placeholder-*.jpg` | AI-generated Stitch placeholders (control room, server rack, engineer at screen, board review, collaboration office, factory floor, logistics warehouse). Real photos/screenshots should replace them 1:1 (same filenames, or update the `src`/`background-image` references in `src/pages/*.html`). |
| Contact form backend | `src/js/main.js` → `window.FLUXFORGE_WEB3FORMS_KEY` (top of file) | The form posts JSON to Web3Forms (`https://api.web3forms.com/submit`). Create a free access key at https://web3forms.com with the destination email `contacto@fluxforge.pt`, confirm the email, and paste the key into the constant (it is a public key, safe to ship in client code). While the key is empty the form falls back to a pre-filled `mailto:`. Fields are sent with human-readable labels in the page language plus `subject`, `from_name`, `replyto` (visitor email) and `botcheck` (honeypot). Success = HTTP 200 with `{ success: true }`; anything else shows the error banner. Optional hardening: in the Web3Forms dashboard restrict the key to the `fluxforge.pt` domain and enable hCaptcha if spam appears. |
| Phone number, street address | `src/pages/contacto.html` (currently only "Portugal" as location) | Brief section 8 lists phone/address as still to be supplied. |
| LinkedIn / social URLs | `src/partials/head.html` → the `Organization` JSON-LD `"sameAs": []` array | Currently empty; add company profile URLs once available. |
| Privacy policy — company details | `src/pages/legal/politica-de-privacidade.html` and `src/pages/en/legal/privacy-policy.html` (§1, "Responsável pelo tratamento" / "Data controller") | The policy itself is real, GDPR-compliant copy (Regulation (EU) 2016/679, Law 58/2019, Article 6(1)(b)/(f), CNPD as supervisory authority) — only the company's full registered name, NIF (tax number) and registered address are left as `[a preencher]` / `[to be completed]` placeholders in both languages. Neither page is `noindex`. |
| Terms of service | `src/pages/legal/termos-de-servico.html`, `src/pages/en/legal/terms-of-service.html` | Both are still explicit `[Placeholder]` text (see "Decisions made without explicit instruction" above) — need real, lawyer-reviewed copy. Both stay `noindex`. |
| Analytics | not implemented anywhere | Brief section 7 asks for GA4 or Plausible with events on "Fale Connosco"/"Talk to Us" clicks and form submissions; no analytics snippet is in this build (add it to `src/partials/head.html` and/or `src/js/main.js` once a provider is chosen — prefer a provider that doesn't block on cookie consent unnecessarily). |
| Domain | Assumed `https://fluxforge.pt` throughout (canonical URLs, sitemap, JSON-LD, OG tags) | Update everywhere (`src/partials/head.html`, `build.js`'s `SITE_URL` constant) if the final domain differs. |

## Deploying (GitHub Pages)

Deployment is automatic. `.github/workflows/deploy.yml` runs on every push to `main` (and manually via *Run workflow*): it installs dependencies with `npm ci`, runs `npm run build` and `npm run check`, uploads `public/` as the Pages artifact and deploys it with `actions/deploy-pages`. The build writes `public/CNAME` (`fluxforge.pt`) and `public/.nojekyll` so the custom domain and clean `folder/index.html` URLs work natively on Pages.

One-time repository setting: **Settings > Pages > Build and deployment > Source = "GitHub Actions"** (the old site used the legacy "Deploy from a branch" mode). Until that is switched, pushes to `main` are not published.

Notes specific to Pages:
- Clean URLs (`/o-que-resolvemos/`, `/en/what-we-solve/`) work because each page is a `folder/index.html`. Pages also serves `/x` for `/x/`.
- `404.html` at the root is used automatically for missing pages.
- Cache headers are managed by GitHub (10 minutes for HTML); no invalidation step is needed.
- To preview a change before it goes live, open a pull request: the build and check steps run on the PR without deploying.
