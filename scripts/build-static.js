#!/usr/bin/env node
// scripts/build-static.js
// Genera el catálogo estático completo: páginas de catálogo paginadas,
// páginas individuales por producto y sitemap.xml
// Sin servidor — sirve con cualquier hosting estático.
'use strict';

const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

// ── configuración ─────────────────────────────────────────────────────────────
const SITE     = 'https://www.bgmdiesel.com.ar';
const WA       = '5493415317707';
const PER_PAGE = 24;
const OUT      = path.resolve(__dirname, '../dist');

// ── utilidades ────────────────────────────────────────────────────────────────
function slugify(str) {
  return String(str).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function mkdirp(d) { fs.mkdirSync(d, { recursive: true }); }

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── categorías ────────────────────────────────────────────────────────────────
const CATS = [
  { slug:'filtros',       label:'Filtros',               re:/FILTRO/ },
  { slug:'motor',         label:'Motor',                 re:/PISTON|PISTÓN|ANILLO|SEGMENTO|JUNTA|VÁLVULA|VALVULA|COJINETE|CIGÜEÑAL|CIGUENAL|CAMISA|BIELA|BLOCK|TAPA DE MOTOR|COLECTOR|TURBO|VOLANTE MOTOR/ },
  { slug:'frenos',        label:'Frenos y Suspensión',   re:/FRENO|PASTILLA|TAMBOR|MORDAZA|CALIPER|SUSPENSION|SUSPENSIÓN|AMORTIGUADOR|RESORTE|BALLESTA|BARRA ESTAB|ROTULA|RÓTULA|BUJE|MUÑON/ },
  { slug:'embrague',      label:'Embrague',              re:/EMBRAGUE|CLUTCH|CRAPO|CRAPODINA|PLATO DE PRESION|DISCO DE EMBRAGUE/ },
  { slug:'transmision',   label:'Transmisión y Cardan',  re:/CAJA DE VEL|CAJA DE CAM|TRANSMISION|TRANSMISIÓN|CARDÁN|CARDAN|CORONA|DIFERENCIAL|SEMIEJES|PLANETARIO/ },
  { slug:'refrigeracion', label:'Refrigeración',         re:/RADIADOR|TERMOSTATO|ENFRIADOR|REFRIGER|BOMBA DE AGUA|TAPA RADIADOR|MANGUERA/ },
  { slug:'inyeccion',     label:'Inyección Diesel',      re:/INYECTOR|TOBERA|INYECCION|INYECCIÓN|COMMON RAIL|BOMBA INYECTORA|REGULADOR DE PRESION/ },
  { slug:'electrico',     label:'Sistema Eléctrico',     re:/ALTERNADOR|ARRANQUE|SENSOR|ELECTR|CABLE|BOBINA|RELAY|FUSIBLE/ },
  { slug:'retenes',       label:'Retenes y Juntas',      re:/RETEN|RETÉN|SELLO|JUNTA TÓRICA|O-RING/ },
  { slug:'direccion',     label:'Dirección',             re:/DIRECCI|COLUMNA|CAJA DE DIRECCION|BOMBA DE DIREC/ },
];

function inferCat(desc) {
  const u = desc.toUpperCase();
  for (const c of CATS) if (c.re.test(u)) return { slug: c.slug, label: c.label };
  return { slug: 'otros', label: 'Otros' };
}

// ── leer Excel ────────────────────────────────────────────────────────────────
const wb  = XLSX.readFile(path.resolve(__dirname, '../productos.xlsx'));
const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

const slugSeen = new Map();
const products = raw.map(r => {
  const codigo = String(r['Código'] || '').trim();
  const desc   = String(r['Descripción'] || '').trim();
  const stock  = Number(r['Stock Act.'] || 0);
  if (!codigo || !desc) return null;
  const cat  = inferCat(desc);
  let   slug = slugify(`${codigo}-${desc}`);
  if (slugSeen.has(slug)) { slug = `${slug}-${slugSeen.size}`; }
  slugSeen.set(slug, true);
  return { codigo, desc, stock, cat, slug };
}).filter(Boolean);

console.log(`✔ ${products.length} productos leídos`);

// índice por categoría
const byCategory = {};
for (const p of products) {
  if (!byCategory[p.cat.slug]) byCategory[p.cat.slug] = { label: p.cat.label, items: [] };
  byCategory[p.cat.slug].items.push(p);
}

// ── CSS compartido ────────────────────────────────────────────────────────────
const CSS = /* css */`
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Barlow:wght@400;500;600&display=swap');
:root{--navy:#1a3060;--navy2:#253d7a;--rojo:#cc1a1a;--rojo2:#e02020;--cyan:#2ba8d8;--fondo:#f4f7fc;--card:#eaeff8;--texto:#1a3060;--suave:#4a5e7a;--gris:#5a6f85}
*{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}
body{font-family:'Barlow',sans-serif;background:var(--fondo);color:var(--texto)}
/* NAV */
nav{position:sticky;top:0;z-index:100;background:var(--navy);border-bottom:3px solid var(--cyan);display:flex;align-items:center;justify-content:space-between;padding:0 5vw;height:64px;box-shadow:0 2px 16px rgba(26,48,96,.3)}
.nav-logo img{height:44px;background:#fff;border-radius:4px;padding:3px 7px}
.nav-links{display:flex;gap:1.8rem;list-style:none}
.nav-links a{color:rgba(255,255,255,.75);text-decoration:none;font-size:.85rem;font-weight:500;letter-spacing:.07em;text-transform:uppercase;transition:color .2s}
.nav-links a:hover,.nav-links a[aria-current]{color:#fff}
.nav-wa{background:var(--rojo);color:#fff;padding:.55rem 1.1rem;border-radius:4px;text-decoration:none;font-weight:700;font-size:.82rem;letter-spacing:.06em;text-transform:uppercase;transition:background .2s;white-space:nowrap}
.nav-wa:hover{background:var(--rojo2)}
/* BREADCRUMB */
.breadcrumb{background:var(--navy);padding:.6rem 5vw;font-size:.8rem;color:rgba(255,255,255,.6)}
.breadcrumb a{color:var(--cyan);text-decoration:none}.breadcrumb a:hover{text-decoration:underline}
.breadcrumb span{margin:0 .4rem}
/* LAYOUT */
.page-wrap{display:flex;gap:2rem;max-width:1280px;margin:2rem auto;padding:0 5vw;align-items:flex-start}
/* SIDEBAR */
aside{width:230px;flex-shrink:0;position:sticky;top:80px}
.aside-box{background:#fff;border-radius:8px;box-shadow:0 2px 12px rgba(26,48,96,.08);padding:1.2rem;margin-bottom:1.5rem}
.aside-title{font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--navy);border-bottom:2px solid var(--cyan);padding-bottom:.5rem;margin-bottom:.8rem}
.cat-list{list-style:none}
.cat-list li a{display:flex;justify-content:space-between;align-items:center;padding:.45rem .4rem;color:var(--suave);text-decoration:none;font-size:.87rem;border-radius:4px;transition:background .15s,color .15s}
.cat-list li a:hover,.cat-list li a[aria-current]{background:var(--fondo);color:var(--navy);font-weight:600}
.badge{background:var(--navy2);color:#fff;font-size:.7rem;border-radius:20px;padding:2px 8px;min-width:26px;text-align:center}
.cat-list li a[aria-current] .badge{background:var(--rojo)}
/* MAIN */
main{flex:1;min-width:0}
.catalog-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;flex-wrap:wrap;gap:.8rem}
.catalog-title{font-family:'Barlow Condensed',sans-serif;font-size:1.7rem;font-weight:800;text-transform:uppercase;color:var(--navy)}
.catalog-count{font-size:.83rem;color:var(--gris)}
/* SEARCH */
.search-wrap{position:relative;margin-bottom:1.5rem}
.search-wrap input{width:100%;padding:.7rem 1rem .7rem 2.8rem;border:1.5px solid #d0d9e8;border-radius:6px;font-size:.9rem;color:var(--texto);background:#fff;outline:none;transition:border .2s;font-family:'Barlow',sans-serif}
.search-wrap input:focus{border-color:var(--cyan)}
.search-icon{position:absolute;left:.85rem;top:50%;transform:translateY(-50%);color:var(--gris);pointer-events:none}
/* GRID */
.product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1.2rem}
.product-card{background:#fff;border-radius:8px;box-shadow:0 2px 12px rgba(26,48,96,.07);overflow:hidden;display:flex;flex-direction:column;transition:box-shadow .2s,transform .2s}
.product-card:hover{box-shadow:0 6px 24px rgba(26,48,96,.14);transform:translateY(-2px)}
.card-img{background:linear-gradient(135deg,var(--fondo) 0%,var(--card) 100%);height:130px;display:flex;align-items:center;justify-content:center;padding:1rem;color:var(--navy2)}
.card-img svg{width:60px;height:60px;opacity:.3}
.card-body{padding:1rem;flex:1;display:flex;flex-direction:column;gap:.4rem}
.card-cat{font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;color:var(--cyan);font-weight:600}
.card-code{font-size:.72rem;color:var(--gris);font-family:monospace}
.card-desc{font-size:.86rem;font-weight:600;color:var(--navy);flex:1;line-height:1.3;margin-top:.1rem}
.stock-in{display:inline-block;font-size:.7rem;padding:2px 8px;border-radius:20px;background:#e6f4ea;color:#1e7e34;font-weight:600}
.stock-out{display:inline-block;font-size:.7rem;padding:2px 8px;border-radius:20px;background:#fef0f0;color:#cc1a1a;font-weight:600}
.card-btn{display:block;margin-top:.8rem;text-align:center;background:var(--navy);color:#fff;text-decoration:none;padding:.55rem;border-radius:5px;font-size:.8rem;font-weight:700;letter-spacing:.05em;transition:background .2s}
.card-btn:hover{background:var(--rojo)}
.card-hidden{display:none!important}
/* PAGINATION */
.pagination{display:flex;gap:.5rem;justify-content:center;margin-top:2.5rem;flex-wrap:wrap;padding-bottom:3rem}
.pagination a,.pagination span,.pagination em{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:5px;font-size:.88rem;font-weight:600;text-decoration:none;transition:background .2s,color .2s}
.pagination a{background:#fff;color:var(--navy);border:1.5px solid #d0d9e8}.pagination a:hover{background:var(--navy);color:#fff;border-color:var(--navy)}
.pagination em{background:var(--rojo);color:#fff;border:1.5px solid var(--rojo);font-style:normal}
.pagination span{color:var(--gris);border:none}
/* DETAIL */
.detail-wrap{max-width:980px;margin:2rem auto;padding:0 5vw 4rem}
.detail-card{background:#fff;border-radius:10px;box-shadow:0 4px 24px rgba(26,48,96,.1);display:flex;overflow:hidden}
.detail-img{width:260px;flex-shrink:0;background:linear-gradient(135deg,var(--fondo) 0%,var(--card) 100%);display:flex;align-items:center;justify-content:center;color:var(--navy2)}
.detail-img svg{width:90px;height:90px;opacity:.25}
.detail-info{padding:2rem;flex:1}
.detail-cat-link{font-size:.78rem;text-transform:uppercase;letter-spacing:.1em;color:var(--cyan);font-weight:600;text-decoration:none}
.detail-cat-link:hover{text-decoration:underline}
.detail-code{font-size:.9rem;color:var(--gris);font-family:monospace;margin:.4rem 0 .8rem}
h1.detail-title{font-family:'Barlow Condensed',sans-serif;font-size:1.9rem;font-weight:800;text-transform:uppercase;line-height:1.1;margin-bottom:.8rem}
.detail-stock{margin-bottom:1.5rem}
.detail-btns{display:flex;gap:1rem;flex-wrap:wrap}
.btn-wa{display:inline-flex;align-items:center;gap:.6rem;background:#25d366;color:#fff;padding:.75rem 1.4rem;border-radius:6px;text-decoration:none;font-weight:700;font-size:.92rem;transition:background .2s}
.btn-wa:hover{background:#1da851}
.btn-cat{display:inline-flex;align-items:center;gap:.5rem;background:var(--fondo);color:var(--navy);padding:.75rem 1.2rem;border-radius:6px;text-decoration:none;font-weight:600;font-size:.88rem;border:1.5px solid #d0d9e8;transition:background .2s}
.btn-cat:hover{background:var(--card)}
.detail-meta{margin-top:1.5rem;padding-top:1.5rem;border-top:1.5px solid var(--fondo);font-size:.83rem;color:var(--gris);line-height:1.8}
.detail-meta strong{color:var(--suave)}
/* FOOTER */
footer{background:var(--navy);color:rgba(255,255,255,.65);padding:2rem 5vw;text-align:center;font-size:.82rem;margin-top:0}
footer a{color:var(--cyan);text-decoration:none}footer a:hover{text-decoration:underline}
footer strong{color:#fff;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;letter-spacing:.06em}
/* RESPONSIVE */
@media(max-width:860px){
  .page-wrap{flex-direction:column}
  aside{width:100%;position:static}
  .detail-card{flex-direction:column}
  .detail-img{width:100%;height:150px}
  nav .nav-links{display:none}
}
`;

// ── SVG icons por categoría ───────────────────────────────────────────────────
const ICON = {
  filtros:       `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><rect x="8" y="8" width="48" height="48" rx="6"/><line x1="16" y1="22" x2="48" y2="22"/><line x1="21" y1="32" x2="43" y2="32"/><line x1="26" y1="42" x2="38" y2="42"/></svg>`,
  motor:         `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><rect x="18" y="18" width="28" height="28" rx="4"/><line x1="8" y1="26" x2="18" y2="26"/><line x1="8" y1="38" x2="18" y2="38"/><line x1="46" y1="26" x2="56" y2="26"/><line x1="46" y1="38" x2="56" y2="38"/><line x1="26" y1="8" x2="26" y2="18"/><line x1="38" y1="8" x2="38" y2="18"/><line x1="26" y1="46" x2="26" y2="56"/><line x1="38" y1="46" x2="38" y2="56"/></svg>`,
  frenos:        `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3"><circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="12"/><circle cx="32" cy="32" r="4"/></svg>`,
  embrague:      `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3"><circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="10"/><line x1="32" y1="10" x2="32" y2="22"/><line x1="32" y1="42" x2="32" y2="54"/><line x1="10" y1="32" x2="22" y2="32"/><line x1="42" y1="32" x2="54" y2="32"/></svg>`,
  transmision:   `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><circle cx="14" cy="14" r="8"/><circle cx="50" cy="14" r="8"/><circle cx="32" cy="50" r="8"/><line x1="22" y1="14" x2="42" y2="14"/><line x1="14" y1="22" x2="32" y2="42"/><line x1="50" y1="22" x2="32" y2="42"/></svg>`,
  refrigeracion: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><rect x="12" y="8" width="40" height="48" rx="4"/><line x1="20" y1="18" x2="44" y2="18"/><line x1="20" y1="25" x2="44" y2="25"/><line x1="20" y1="32" x2="44" y2="32"/><line x1="20" y1="39" x2="44" y2="39"/><line x1="20" y1="46" x2="44" y2="46"/></svg>`,
  inyeccion:     `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="32" y1="8" x2="32" y2="56"/><circle cx="32" cy="22" r="7"/><circle cx="32" cy="42" r="7"/><line x1="18" y1="8" x2="46" y2="8"/></svg>`,
  electrico:     `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="36,8 18,36 32,36 28,56 46,28 32,28"/></svg>`,
  retenes:       `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3"><circle cx="32" cy="32" r="24"/><circle cx="32" cy="32" r="14"/><circle cx="32" cy="32" r="4"/></svg>`,
  direccion:     `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3"><circle cx="32" cy="32" r="22"/><line x1="32" y1="10" x2="32" y2="54"/><line x1="10" y1="32" x2="54" y2="32"/><circle cx="32" cy="32" r="6"/></svg>`,
  otros:         `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><rect x="10" y="10" width="44" height="44" rx="6"/><circle cx="32" cy="32" r="10"/><line x1="32" y1="10" x2="32" y2="22"/><line x1="32" y1="42" x2="32" y2="54"/></svg>`,
};

// ── componentes HTML reutilizables ────────────────────────────────────────────
function navHtml(activePage = '') {
  const links = [
    ['/', 'Inicio'],
    ['/catalogo/', 'Catálogo'],
    ['/#marcas', 'Marcas'],
    ['/#contacto', 'Contacto'],
  ];
  return `<nav>
  <a class="nav-logo" href="/"><img src="/img/logo.jpg" alt="BGM Diesel" width="160" height="52"></a>
  <ul class="nav-links">
    ${links.map(([href, label]) => `<li><a href="${href}"${activePage === label ? ' aria-current="page"' : ''}>${label}</a></li>`).join('\n    ')}
    <li><a class="nav-wa" href="https://wa.me/${WA}?text=Hola%2C+quiero+consultar+sobre+un+repuesto">WhatsApp</a></li>
  </ul>
</nav>`;
}

function footerHtml() {
  return `<footer>
  <strong>BGM DIESEL</strong><br>
  Repuestos para camiones · Bv. 27 de Febrero 3447, Rosario, Santa Fe<br>
  Tel: <a href="tel:+543417926696">(0341) 792-6696</a> · <a href="tel:+543414312003">(0341) 431-2003</a><br>
  <a href="mailto:ventas@bgmdiesel.com.ar">ventas@bgmdiesel.com.ar</a>
  · <a href="/catalogo/">Catálogo</a>
  · <a href="https://www.instagram.com/bgmdiesel/" rel="noopener">Instagram</a>
</footer>`;
}

function sidebarHtml(activeCatSlug = '') {
  const allCatsWithCount = Object.entries(byCategory)
    .sort((a, b) => b[1].items.length - a[1].items.length);

  const items = [
    `<li><a href="/catalogo/"${!activeCatSlug ? ' aria-current="page"' : ''}><span>Todos</span><span class="badge">${products.length}</span></a></li>`,
    ...allCatsWithCount.map(([slug, { label, items }]) =>
      `<li><a href="/catalogo/categoria/${slug}/"${activeCatSlug === slug ? ' aria-current="page"' : ''}><span>${label}</span><span class="badge">${items.length}</span></a></li>`
    ),
  ];

  return `<aside>
  <div class="aside-box">
    <div class="aside-title">Categorías</div>
    <ul class="cat-list">${items.join('\n')}</ul>
  </div>
</aside>`;
}

function productCardHtml(p) {
  const icon  = ICON[p.cat.slug] || ICON.otros;
  const stock = p.stock > 0
    ? `<span class="stock-in">En stock (${p.stock})</span>`
    : `<span class="stock-out">Sin stock</span>`;
  const waMsg = encodeURIComponent(`Hola, quiero consultar sobre: ${p.codigo} – ${p.desc}`);
  return `<article class="product-card">
  <div class="card-img">${icon}</div>
  <div class="card-body">
    <span class="card-cat">${esc(p.cat.label)}</span>
    <span class="card-code">${esc(p.codigo)}</span>
    <div class="card-desc">${esc(p.desc)}</div>
    ${stock}
    <a class="card-btn" href="/producto/${p.slug}/">Ver detalle</a>
  </div>
</article>`;
}

function paginationHtml(current, total, baseUrl) {
  if (total <= 1) return '';
  const pages = [];

  function pageUrl(n) {
    return n === 1 ? baseUrl : `${baseUrl}pagina/${n}/`;
  }

  // prev
  if (current > 1) pages.push(`<a href="${pageUrl(current - 1)}" aria-label="Anterior">&#8249;</a>`);
  else pages.push(`<span>&#8249;</span>`);

  // numbers — show first, last, current ±2
  const shown = new Set();
  [1, 2, current - 2, current - 1, current, current + 1, current + 2, total - 1, total]
    .filter(n => n >= 1 && n <= total)
    .forEach(n => shown.add(n));

  let prev = 0;
  for (const n of [...shown].sort((a, b) => a - b)) {
    if (prev && n - prev > 1) pages.push(`<span>…</span>`);
    if (n === current) pages.push(`<em>${n}</em>`);
    else pages.push(`<a href="${pageUrl(n)}">${n}</a>`);
    prev = n;
  }

  // next
  if (current < total) pages.push(`<a href="${pageUrl(current + 1)}" aria-label="Siguiente">&#8250;</a>`);
  else pages.push(`<span>&#8250;</span>`);

  return `<nav class="pagination" aria-label="Páginas">${pages.join('')}</nav>`;
}

// ── página de catálogo (genérica) ─────────────────────────────────────────────
function catalogPageHtml({ title, desc, items, page, totalPages, baseUrl, activeCatSlug, canonicalUrl }) {
  const cards = items.map(productCardHtml).join('\n');
  const pag   = paginationHtml(page, totalPages, baseUrl);
  const bc    = activeCatSlug
    ? `<nav class="breadcrumb"><a href="/">Inicio</a><span>›</span><a href="/catalogo/">Catálogo</a><span>›</span>${esc(CATS.find(c => c.slug === activeCatSlug)?.label || 'Categoría')}</nav>`
    : `<nav class="breadcrumb"><a href="/">Inicio</a><span>›</span>Catálogo</nav>`;

  const pageLabel = page > 1 ? ` – Página ${page}` : '';

  return `<!DOCTYPE html>
<html lang="es-AR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)}${pageLabel} | BGM Diesel</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${page > 1 ? 'noindex,' : ''}follow">
<link rel="canonical" href="${SITE}${canonicalUrl}">
${page > 1 ? `<link rel="prev" href="${SITE}${baseUrl}${page > 2 ? `pagina/${page - 1}/` : ''}">` : ''}
${page < totalPages ? `<link rel="next" href="${SITE}${baseUrl}pagina/${page + 1}/">` : ''}
<meta property="og:title" content="${esc(title)} | BGM Diesel">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE}${canonicalUrl}">
<meta property="og:locale" content="es_AR">
<link rel="icon" type="image/jpeg" href="/img/logo.jpg">
<style>${CSS}</style>
</head>
<body>
${navHtml('Catálogo')}
${bc}
<div class="page-wrap">
  ${sidebarHtml(activeCatSlug)}
  <main>
    <div class="catalog-header">
      <h1 class="catalog-title">${esc(title)}</h1>
      <span class="catalog-count">${items.length} de ${activeCatSlug ? byCategory[activeCatSlug].items.length : products.length} productos${pageLabel}</span>
    </div>
    ${!activeCatSlug ? `<div class="search-wrap">
      <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="search" id="searchInput" placeholder="Buscar por código o descripción…" aria-label="Buscar productos">
    </div>` : ''}
    <section class="product-grid" id="productGrid">${cards}</section>
    <div id="noResults" style="display:none;text-align:center;padding:3rem;color:var(--gris);font-size:1rem">No se encontraron productos para tu búsqueda.</div>
    ${pag}
  </main>
</div>
${footerHtml()}
<script>
(function(){
  var input = document.getElementById('searchInput');
  if(!input) return;
  var cards = document.querySelectorAll('.product-card');
  var noRes = document.getElementById('noResults');
  input.addEventListener('input', function(){
    var q = this.value.toLowerCase().trim();
    var found = 0;
    cards.forEach(function(card){
      var text = card.textContent.toLowerCase();
      var match = !q || text.includes(q);
      card.classList.toggle('card-hidden', !match);
      if(match) found++;
    });
    noRes.style.display = found ? 'none' : 'block';
  });
})();
</script>
</body>
</html>`;
}

// ── página de producto individual ─────────────────────────────────────────────
function productPageHtml(p, related) {
  const icon  = ICON[p.cat.slug] || ICON.otros;
  const stock = p.stock > 0
    ? `<span class="stock-in">En stock (${p.stock} unidades)</span>`
    : `<span class="stock-out">Sin stock — consultá disponibilidad</span>`;
  const waMsg = encodeURIComponent(`Hola BGM Diesel, quiero consultar sobre: ${p.codigo} – ${p.desc}`);
  const waUrl = `https://wa.me/${WA}?text=${waMsg}`;

  const relatedCards = related.slice(0, 4).map(productCardHtml).join('\n');

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    "name": p.desc,
    "description": `Repuesto para camiones – Código: ${p.codigo}. ${p.cat.label}. Disponible en BGM Diesel, Rosario, Argentina.`,
    "sku": p.codigo,
    "brand": { "@type": "Brand", "name": "BGM Diesel" },
    "offers": {
      "@type": "Offer",
      "availability": p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "priceCurrency": "ARS",
      "seller": { "@type": "Organization", "name": "BGM Diesel" },
      "url": `${SITE}/producto/${p.slug}/`
    },
    "category": p.cat.label
  });

  return `<!DOCTYPE html>
<html lang="es-AR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(p.codigo)} – ${esc(p.desc)} | BGM Diesel</title>
<meta name="description" content="Comprá ${esc(p.desc)} (código ${esc(p.codigo)}) en BGM Diesel, Rosario. ${p.cat.label}. ${p.stock > 0 ? 'En stock.' : 'Consultá disponibilidad.'} ☎ (0341) 792-6696">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${SITE}/producto/${p.slug}/">
<meta property="og:title" content="${esc(p.codigo)} – ${esc(p.desc)} | BGM Diesel">
<meta property="og:description" content="${p.cat.label} – Disponible en BGM Diesel, Rosario, Argentina.">
<meta property="og:type" content="product">
<meta property="og:url" content="${SITE}/producto/${p.slug}/">
<meta property="og:locale" content="es_AR">
<link rel="icon" type="image/jpeg" href="/img/logo.jpg">
<script type="application/ld+json">${schema}</script>
<style>${CSS}</style>
</head>
<body>
${navHtml('Catálogo')}
<nav class="breadcrumb">
  <a href="/">Inicio</a><span>›</span>
  <a href="/catalogo/">Catálogo</a><span>›</span>
  <a href="/catalogo/categoria/${p.cat.slug}/">${esc(p.cat.label)}</a><span>›</span>
  ${esc(p.codigo)}
</nav>
<div class="detail-wrap">
  <div class="detail-card">
    <div class="detail-img">${icon}</div>
    <div class="detail-info">
      <a class="detail-cat-link" href="/catalogo/categoria/${p.cat.slug}/">${esc(p.cat.label)}</a>
      <div class="detail-code">Código: ${esc(p.codigo)}</div>
      <h1 class="detail-title">${esc(p.desc)}</h1>
      <div class="detail-stock">${stock}</div>
      <div class="detail-btns">
        <a class="btn-wa" href="${waUrl}" target="_blank" rel="noopener">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.117 1.534 5.845L0 24l6.335-1.51A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.016-1.376l-.36-.214-3.73.889.928-3.628-.235-.373A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>
          Consultar por WhatsApp
        </a>
        <a class="btn-cat" href="/catalogo/categoria/${p.cat.slug}/">
          ← Ver más en ${esc(p.cat.label)}
        </a>
      </div>
      <div class="detail-meta">
        <strong>Código:</strong> ${esc(p.codigo)}<br>
        <strong>Categoría:</strong> ${esc(p.cat.label)}<br>
        <strong>Disponibilidad:</strong> ${p.stock > 0 ? `${p.stock} unidades en stock` : 'Consultá disponibilidad'}<br>
        <strong>Zona de cobertura:</strong> Todo Argentina · Envíos desde Rosario, Santa Fe
      </div>
    </div>
  </div>
  ${relatedCards ? `
  <h2 style="font-family:'Barlow Condensed',sans-serif;font-size:1.3rem;font-weight:800;text-transform:uppercase;color:var(--navy);margin:2rem 0 1rem;border-top:2px solid var(--card);padding-top:1.5rem">Productos relacionados</h2>
  <div class="product-grid">${relatedCards}</div>` : ''}
</div>
${footerHtml()}
</body>
</html>`;
}

// ── generar páginas de catálogo ───────────────────────────────────────────────
function generateCatalogPages(items, baseUrl, title, desc, catSlug = '') {
  const totalPages = Math.ceil(items.length / PER_PAGE);
  for (let page = 1; page <= totalPages; page++) {
    const slice = items.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const canonicalUrl = page === 1 ? baseUrl : `${baseUrl}pagina/${page}/`;
    const html = catalogPageHtml({ title, desc, items: slice, page, totalPages, baseUrl, activeCatSlug: catSlug, canonicalUrl });

    if (page === 1) {
      mkdirp(path.join(OUT, baseUrl));
      fs.writeFileSync(path.join(OUT, baseUrl, 'index.html'), html);
    } else {
      const dir = path.join(OUT, baseUrl, 'pagina', String(page));
      mkdirp(dir);
      fs.writeFileSync(path.join(dir, 'index.html'), html);
    }
  }
  return totalPages;
}

// ── main ──────────────────────────────────────────────────────────────────────
function copyDirSync(src, dest) {
  mkdirp(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

async function main() {
  console.log('Limpiando dist/...');
  fs.rmSync(OUT, { recursive: true, force: true });
  mkdirp(OUT);

  // Copiar imágenes
  const imgSrc = path.resolve(__dirname, '../img');
  if (fs.existsSync(imgSrc)) {
    copyDirSync(imgSrc, path.join(OUT, 'img'));
    console.log('✔ Imágenes copiadas a dist/img/');
  }

  // Catálogo general
  console.log('Generando catálogo principal...');
  const totalCatPages = generateCatalogPages(
    products,
    '/catalogo/',
    'Catálogo de Repuestos para Camiones',
    'Catálogo completo de repuestos para camiones en BGM Diesel, Rosario. Scania, Mercedes Benz, Volvo, Cummins, Ford Cargo. Más de 3900 productos.',
    ''
  );
  console.log(`  ✔ ${totalCatPages} páginas de catálogo`);

  // Categorías
  console.log('Generando páginas de categorías...');
  for (const [slug, { label, items }] of Object.entries(byCategory)) {
    generateCatalogPages(
      items,
      `/catalogo/categoria/${slug}/`,
      label,
      `${label} para camiones en BGM Diesel, Rosario. ${items.length} productos disponibles.`,
      slug
    );
  }
  console.log(`  ✔ ${Object.keys(byCategory).length} categorías`);

  // Productos individuales
  console.log('Generando páginas de productos...');
  const catIndex = {};
  for (const p of products) {
    if (!catIndex[p.cat.slug]) catIndex[p.cat.slug] = [];
    catIndex[p.cat.slug].push(p);
  }

  for (const p of products) {
    // 4 relacionados de la misma categoría (excluyendo el actual)
    const related = (catIndex[p.cat.slug] || []).filter(r => r.slug !== p.slug).slice(0, 4);
    const html = productPageHtml(p, related);
    const dir  = path.join(OUT, 'producto', p.slug);
    mkdirp(dir);
    fs.writeFileSync(path.join(dir, 'index.html'), html);
  }
  console.log(`  ✔ ${products.length} páginas de producto`);

  // Sitemap
  console.log('Generando sitemap.xml...');
  const today = new Date().toISOString().split('T')[0];
  const urls  = [
    `<url><loc>${SITE}/catalogo/</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>`,
    ...Object.keys(byCategory).map(slug =>
      `<url><loc>${SITE}/catalogo/categoria/${slug}/</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`
    ),
    ...products.map(p =>
      `<url><loc>${SITE}/producto/${p.slug}/</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`
    ),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap);
  console.log(`  ✔ sitemap.xml con ${urls.length} URLs`);

  console.log(`\n✅ Build completo en dist/`);
  console.log(`   Productos:  ${products.length}`);
  console.log(`   Catálogo:   ${totalCatPages} páginas`);
  console.log(`   Categorías: ${Object.keys(byCategory).length}`);
  console.log(`   Sitemap:    ${urls.length} URLs`);
}

main().catch(err => { console.error(err); process.exit(1); });
