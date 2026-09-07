// One-time conversion helper: pulls <main> out of a raw Stitch export and
// rewrites icons / images / internal links to production-ready markup.
// Usage: node scripts/convert.js <input.html> <output.html>
const fs = require('fs');

const IMAGE_MAP = {
  'AB6AXuAMZvnYWpwUHSPKwWazR8-DsAAe3ixaVyfY-na6l_CsFekThTqxakVaxjrfajpybutk3pe02RA1OWdevr47WriUoqOXho04xcEaCcFl8Twp-VjsWNsKsSPlc-vS279RutNNq-QYEkpPBaczvMOlhgxp7CDslOzfhVUc-P1bjHmayDdrPNTGDDVh0c739LOfNYARNraNK8YXpKazoEGe39oIEV9xanfl_hXsBc-2-Gkz0NhgKxX-5PPAgQ':
    { file: '/assets/img/placeholder-control-room.jpg', w: 1408, h: 768,
      alt: 'Sala de controlo técnica com estações de trabalho e monitores a exibir telemetria de uma pipeline de AI' },
  'AB6AXuCWPLF9gkUbVevPkTxxR9huzdfcAastxpLuGuuT4S3VZr6quABvYT0-dflOATJWmxIdPusYWDiFsKsyMGp77SqCIW4Ew4ylQX9CR6vC6VYtIs0oAue7xC3-XS7UXfbbV1-XkP3YO9TB8hIFgDLrmWz5Q2olfeprcI444vXmIHN1x0MclRPtLcS-_aP8xQK2nQB6-I5YdI3-N3-IOO4NJnS1TlWNKjJYPFSQcS9sVdnK2n-helaI-cSmgA':
    { file: '/assets/img/placeholder-board-review.jpg', w: 1408, h: 768,
      alt: 'Reunião de revisão executiva com painéis de análise numa sala de vidro' },
  'AB6AXuCbeujFA9L4xyrNX74LSE0eTzVQT5FUvNs4iHSNRLH-Eh0NyVSda7LGoBTcx-Bmc07Nj9CITEAfUP90r0SLNmFJpXm_N2TuomqgZUOFPcueHeT68ixX2_pKnn_5yBrWZ1tO3wGVyjIKTp8HZQ-h5yoggmKdJ9hVud867JdzvNP6OvBGRtyarMD-kCV52Ku5wQxVk8wcsKC6Gxu_eVitSy8htShKOkX6clLYkuY4PRL65gTwzCt2VoPPpA':
    { file: '/assets/img/placeholder-collab-office.jpg', w: 1408, h: 768,
      alt: 'Equipa de engenharia e gestores a colaborar em torno de vários monitores num escritório moderno' },
  'AB6AXuClxFc5olHO_dIawHB7LPmCt-CCdOaHwcosQ48WCc31ecw6CVTsrq7cV6l8Nv7xZZLwBTGRYWTO9NcAVXE64m4DubTKOYVHdhUijij6JQGyKhQtU4IWLHJUE71tPFNSKos0wTKDx8Vg5KfmMBKnQih9CpR1sjWXZ-SVkfuAH2QejHjwiLaLp7hZluob8ppy2m20JctsCuhDwiKiLSB9aCmyBjYA_c8fcyR8irLte7qE7qXfkMGphFZ7fw':
    { file: '/assets/img/placeholder-server-rack.jpg', w: 1408, h: 768,
      alt: 'Bastidores de servidores empresariais com cablagem de fibra ótica organizada' },
  'AB6AXuD8iNoSkPtgbDCazZwUddyP-b6zKbLyd0Uk3rnMUEKZZgRxuZdil99nJLq8nbhJzU_GjUuMhzh5hVCK3eQTkFA9tnJSp-VoCfwGCnIhdrcupXeXbXlaBZTGBCvkMgk-EKuPmfvgRmp5ytoBKsRNVi2muGqIf0VIjyn5kcTRAvERKnDX-HvGhG237dfseOiA8MVluSbb6J8WAK9QWcB1Weqfz-okMBukihdqGvSuoq1dS5vHUmzHU3JqVQ':
    { file: '/assets/img/placeholder-logistics-warehouse.jpg', w: 1408, h: 768,
      alt: 'Centro de controlo logístico com sistemas de transporte automatizados e ecrãs de otimização de rotas' },
  'AB6AXuD_oSq0ci50p7_eOMO9m4qyD7Oxo_m9d2MEFCGJ-tbFjXRStFTAdQ_Br1QTeZXMIJn8rP7cWETxTEcEG6sPXXBZlaFrEuYWzSH9h1IJNJfnnNru8bRJ9F9mbZW9DQtV7w05kzRNpdUyFBkoaM9vEFZu3xsEbryvnnf3FyeG1WtVYWmy2Qro_VU8XQCborLCwrgCDMz-l6tk_f-JHbSRXmlDnfKUWfFbJZE9XMWADNkEwVIM3S7I2vT7rw':
    { file: '/assets/img/placeholder-factory-floor.jpg', w: 1408, h: 768,
      alt: 'Linha de montagem industrial moderna com robótica de precisão e supervisão de software' },
  'AB6AXuDSx3qBuDYBBy28WxiHT1WS60L--dB9OtFguQhnLUfxxgARs9jWCmPnVv72p5GancMbCW-aRvAlTVwaWyZo-M21-XLZuy_VPfAW7uqWSz-y6goE6zwonR0iXsluYedqw1syFOTVJbrSQYRhRXy8oJVl6x-t1jRNFGjszHtaPHu2bynntohqyT8dnuhrkogBDIkQpCxXP53752KZg6nUl2szRB4Eptp_qi50YWc915F52CsxZXhPpnsEwg':
    { file: '/assets/img/placeholder-engineer-screen.jpg', w: 1408, h: 768,
      alt: 'Engenheiro de software a analisar curvas de perda de um modelo de AI num ecrã de alta resolução' },
};

const LINK_MAP = {
  'home': '/',
  'o-que-resolvemos': '/o-que-resolvemos/',
  'como-construimos': '/como-construimos/',
  'como-colaboramos': '/como-colaboramos/',
  'porque-nos': '/porque-nos/',
  'fale-connosco': '/contacto/',
  'politica-de-privacidade': '/legal/politica-de-privacidade/',
  'termos-de-servico': '/legal/termos-de-servico/',
};

function extractMain(html) {
  const m = html.match(/<main[^>]*>([\s\S]*)<\/main>/);
  if (!m) throw new Error('no <main> found');
  return m[1];
}

function replaceIcons(html) {
  return html.replace(/<span class="([^"]*)">\s*([a-z_0-9]+)\s*<\/span>/g, (full, cls, name) => {
    if (!cls.includes('material-symbols-outlined')) return full;
    const extra = cls.replace('material-symbols-outlined', '').replace(/\s+/g, ' ').trim();
    const classAttr = ('icon ' + extra).replace(/\s+/g, ' ').trim();
    return `<svg class="${classAttr}" aria-hidden="true" focusable="false"><use href="/assets/icons.svg#i-${name}"></use></svg>`;
  });
}

function replaceImages(html) {
  // <img ... data-alt="..." ... src="https://lh3.googleusercontent.com/aida-public/XXXX">
  html = html.replace(/<img([^>]*?)data-alt="([^"]*)"([^>]*?)src="https:\/\/lh3\.googleusercontent\.com\/aida-public\/([^">]+)"([^>]*)>/g,
    (full, pre, dataAlt, mid, id, post) => {
      const entry = IMAGE_MAP[id];
      if (!entry) return full;
      let attrs = (pre + mid + post).replace(/\s+/g, ' ');
      return `<img${attrs}src="${entry.file}" width="${entry.w}" height="${entry.h}" alt="${entry.alt}" loading="lazy">`;
    });
  // background-image: url('https://lh3.googleusercontent.com/aida-public/XXXX')
  html = html.replace(/style="background-image: url\('https:\/\/lh3\.googleusercontent\.com\/aida-public\/([^']+)'\)"/g,
    (full, id) => {
      const entry = IMAGE_MAP[id];
      if (!entry) return full;
      return `style="background-image: url('${entry.file}')"`;
    });
  // logo <img> instances (header/footer) - handled by partials, but strip any remaining ones in main content
  html = html.replace(/<img([^>]*?)src="https:\/\/lh3\.googleusercontent\.com\/aida\/[^"]+"([^>]*)>/g,
    (full, pre, post) => `<img${pre}src="/assets/logo.svg"${post}>`);
  return html;
}

function replaceLinks(html) {
  html = html.replace(/<a([^>]*?)data-path="([^"]+)"([^>]*?)href="#"([^>]*)>/g, (full, pre, path, mid, post) => {
    const url = LINK_MAP[path];
    if (!url) return full;
    let attrs = (pre + mid + post).replace(/\s+/g, ' ');
    return `<a${attrs}href="${url}">`;
  });
  html = html.replace(/<a([^>]*?)href="#"([^>]*?)data-path="([^"]+)"([^>]*)>/g, (full, pre, mid, path, post) => {
    const url = LINK_MAP[path];
    if (!url) return full;
    let attrs = (pre + mid + post).replace(/\s+/g, ' ');
    return `<a${attrs}href="${url}">`;
  });
  return html;
}

function stripDataAttrs(html) {
  return html.replace(/\sdata-path="[^"]*"/g, '').replace(/\sdata-alt="[^"]*"/g, '').replace(/\sdata-active-classes="[^"]*"/g, '');
}

const [, , inFile, outFile] = process.argv;
if (!inFile || !outFile) {
  console.error('usage: node convert.js <in> <out>');
  process.exit(1);
}
let raw = fs.readFileSync(inFile, 'utf8');
let main = extractMain(raw);
main = replaceImages(main);
main = replaceIcons(main);
main = replaceLinks(main);
main = stripDataAttrs(main);
fs.writeFileSync(outFile, main.trim() + '\n');
console.log('wrote', outFile, main.length, 'chars');
