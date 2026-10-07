const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const PUBLIC = path.join(ROOT, 'public');
const DIST = path.join(ROOT, 'dist');
const data = JSON.parse(fs.readFileSync(path.join(SRC, 'data.json'), 'utf8'));

const site = {
  ...data.site,
  baseUrl: (process.env.SITE_URL || data.site.baseUrl || 'https://example.com').replace(/\/$/, '')
};

const sitePath = (() => {
  try {
    const pathname = new URL(site.baseUrl).pathname.replace(/\/+$/, '');
    return pathname === '/' ? '' : pathname;
  } catch {
    return '';
  }
})();

function withBasePath(pathname = '/') {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${sitePath}${normalized}` || '/';
}

function rewriteInternalPaths(content) {
  if (!sitePath) return content;
  return content
    .replace(/(href|src)="\/(?!\/)/g, `$1="${sitePath}/`)
    .replace(/(href|src)='\/(?!\/)/g, `$1='${sitePath}/`);
}

const categoryMap = Object.fromEntries(data.categories.map(c => [c.id, c]));

const imagePools = {
  faciales: [
    'https://images.pexels.com/photos/7446664/pexels-photo-7446664.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/3985329/pexels-photo-3985329.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/7446673/pexels-photo-7446673.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/3985333/pexels-photo-3985333.jpeg?auto=compress&cs=tinysrgb&w=1200'
  ],
  corporales: [
    'https://images.pexels.com/photos/6663372/pexels-photo-6663372.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/6186768/pexels-photo-6186768.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/3760262/pexels-photo-3760262.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/9335979/pexels-photo-9335979.jpeg?auto=compress&cs=tinysrgb&w=1200'
  ],
  capilar: [
    'https://images.pexels.com/photos/29189946/pexels-photo-29189946.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/7755680/pexels-photo-7755680.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/3993330/pexels-photo-3993330.jpeg?auto=compress&cs=tinysrgb&w=1200'
  ],
  masajes: [
    'https://images.pexels.com/photos/3865491/pexels-photo-3865491.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/6628647/pexels-photo-6628647.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/3997991/pexels-photo-3997991.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/6187419/pexels-photo-6187419.jpeg?auto=compress&cs=tinysrgb&w=1200'
  ],
  paquetes: [
    'https://images.pexels.com/photos/5240804/pexels-photo-5240804.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/19641809/pexels-photo-19641809.jpeg?auto=compress&cs=tinysrgb&w=1200'
  ]
};

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function jsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

function cleanDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function write(filePath, content) {
  const full = path.join(DIST, filePath);
  ensureDir(full);
  const output = filePath.endsWith('.html') ? rewriteInternalPaths(content) : content;
  fs.writeFileSync(full, output, 'utf8');
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

function whatsappUrl(message) {
  return `https://wa.me/${site.whatsappInternational}?text=${encodeURIComponent(message)}`;
}

function stableIndex(text, length) {
  let total = 0;
  for (const ch of text) total = (total + ch.charCodeAt(0)) % 997;
  return total % length;
}

function treatmentImage(t) {
  const pool = imagePools[t.category] || imagePools.faciales;
  return pool[stableIndex(t.slug, pool.length)];
}

function categoryImage(id) {
  const pool = imagePools[id] || imagePools.faciales;
  return pool[0];
}

function head({ title, description, canonical, ogTitle = title, ogDescription = description, schema = [], ogImage }) {
  const image = ogImage || categoryImage('faciales');
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${esc(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="es_EC">
  <meta property="og:title" content="${esc(ogTitle)}">
  <meta property="og:description" content="${esc(ogDescription)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:image" content="${esc(image)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#6f5647">
  <link rel="preconnect" href="https://images.pexels.com">
  <link rel="icon" href="/assets/logo.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/styles.css">
  <link rel="stylesheet" href="/assets/catalog.css">
  ${schema.map(item => `<script type="application/ld+json">${jsonLd(item)}</script>`).join('\n  ')}
</head>`;
}

function header() {
  return `<header class="site-header">
    <a class="brand" href="/" aria-label="${esc(site.brand)} - Inicio">
      <img src="/assets/logo.svg" alt="" width="44" height="44">
      <span><strong>${esc(site.brand)}</strong><small>${esc(site.tagline)}</small></span>
    </a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav">Menú</button>
    <nav id="main-nav" class="main-nav" aria-label="Navegación principal">
      <a href="/#catalogo">Catálogo</a>
      <a href="/#categorias">Categorías</a>
      <a href="/#sobre-nosotros">Nosotros</a>
      <a href="/#contacto">Contacto</a>
      <a class="button button-sm" href="${whatsappUrl('Hola, quisiera reservar una cita en el centro estético.')}">Reservar cita</a>
    </nav>
  </header>`;
}

function footer() {
  return `<footer id="contacto" class="site-footer">
    <div class="footer-brand">
      <img src="/assets/logo.svg" alt="" width="54" height="54">
      <h2>${esc(site.brand)}</h2>
      <p>${esc(site.tagline)}</p>
    </div>
    <div><h3>Contacto</h3><a href="${whatsappUrl('Hola, quisiera información sobre sus tratamientos.')}">WhatsApp ${esc(site.whatsappDisplay)}</a><p>${esc(site.hours)}</p><p>${esc(site.country)}</p></div>
    <div><h3>Catálogo</h3>${data.categories.map(c => `<a href="/#catalogo">${esc(c.name)}</a>`).join('')}</div>
    <div><h3>Información</h3><p>Los servicios se adaptan a valoración y necesidades individuales. La información del sitio es orientativa.</p></div>
  </footer>
  <div class="footer-bottom">© ${new Date().getFullYear()} ${esc(site.brand)} · Sitio informativo y de reservas</div>
  <a class="whatsapp-float" href="${whatsappUrl('Hola, quisiera información sobre sus tratamientos.')}"><span aria-hidden="true">✦</span> WhatsApp</a>
  <script src="/assets/client.js" defer></script>`;
}

function treatmentCard(t) {
  const cat = categoryMap[t.category];
  const img = treatmentImage(t);
  return `<article class="treatment-card" data-treatment-card data-category="${esc(t.category)}" data-search="${esc((t.name + ' ' + t.seoTerms.join(' ')).toLowerCase())}">
    <a class="card-image" href="/tratamientos/${esc(t.slug)}/" aria-label="Ver ${esc(t.name)}">
      <img src="${img}" alt="Imagen referencial de ${esc(t.name)}" loading="lazy" width="900" height="720">
      <span class="card-category">${esc(cat.name)}</span>
    </a>
    <div class="card-body">
      <div class="card-title-row"><h3><a href="/tratamientos/${esc(t.slug)}/">${esc(t.name)}</a></h3><strong>${esc(t.price)}</strong></div>
      <p>${esc(t.priceNote)}</p>
      <div class="card-actions"><a class="card-link" href="/tratamientos/${esc(t.slug)}/">Ver detalles</a><a class="card-whatsapp" href="${whatsappUrl(`Hola, quisiera reservar ${t.name}.`)}">Reservar</a></div>
    </div>
  </article>`;
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'BeautySalon',
  name: site.brand,
  description: site.description,
  telephone: `+${site.whatsappInternational}`,
  areaServed: site.country,
  url: site.baseUrl
};

function categoryTile(c) {
  const count = data.treatments.filter(t => t.category === c.id).length;
  return `<a class="category-tile" href="#catalogo" data-category-jump="${esc(c.id)}">
    <img src="${categoryImage(c.id)}" alt="${esc(c.name)}" loading="lazy" width="900" height="650">
    <span class="category-overlay"><small>${count} ${count === 1 ? 'servicio' : 'servicios'}</small><strong>${esc(c.name)}</strong><em>Explorar →</em></span>
  </a>`;
}

function homePage() {
  const title = `${site.brand} | Catálogo de tratamientos estéticos`;
  const canonical = `${site.baseUrl}/`;
  const schema = [organizationSchema, {'@context':'https://schema.org','@type':'WebSite',name:site.brand,url:site.baseUrl,inLanguage:'es-EC'}];
  const heroImage = categoryImage('faciales');

  return `${head({ title, description: site.description, canonical, schema, ogImage: heroImage })}
<body>
  ${header()}
  <main>
    <section class="catalog-hero">
      <div class="catalog-hero-image">
        <img src="${heroImage}" alt="Tratamiento facial en centro estético" width="1400" height="900" fetchpriority="high">
      </div>
      <div class="catalog-hero-panel">
        <p class="eyebrow">Cuidado estético · bienestar</p>
        <h1>Encuentra tu tratamiento.</h1>
        <p>Faciales, corporales, capilar y masajes. Revisa precios, conoce cada servicio y reserva directamente por WhatsApp.</p>
        <div class="hero-actions"><a class="button" href="#catalogo">Ver catálogo</a><a class="button button-ghost" href="${whatsappUrl('Hola, quisiera orientación para elegir un tratamiento.')}">Necesito orientación</a></div>
      </div>
    </section>

    <section id="categorias" class="category-showcase">
      <div class="section-title-row"><div><p class="eyebrow">Explora</p><h2>Elige una categoría</h2></div><p>Primero lo visual. Entra al tratamiento que te interesa y revisa el detalle cuando lo necesites.</p></div>
      <div class="category-grid">${data.categories.map(categoryTile).join('\n')}</div>
    </section>

    <section id="catalogo" class="catalog-section">
      <div class="catalog-heading">
        <div><p class="eyebrow">Catálogo</p><h2>Todos los tratamientos</h2></div>
        <label class="catalog-search"><span class="sr-only">Buscar tratamiento</span><input id="treatment-search" type="search" placeholder="Buscar tratamiento…"></label>
      </div>
      <div class="filters" role="group" aria-label="Filtrar tratamientos">
        <button class="filter is-active" data-filter="all">Todos</button>${data.categories.map(c => `<button class="filter" data-filter="${esc(c.id)}">${esc(c.name)}</button>`).join('')}
      </div>
      <div class="treatment-grid" id="treatment-grid">${data.treatments.map(treatmentCard).join('\n')}</div>
      <p class="empty-state" id="empty-state" hidden>No encontramos un tratamiento con esos filtros.</p>
    </section>

    <section class="quick-booking">
      <div><p class="eyebrow">Reserva rápida</p><h2>¿Ya sabes qué quieres?</h2><p>Escríbenos por WhatsApp y coordinamos tu cita.</p></div>
      <a class="button button-light" href="${whatsappUrl('Hola, quisiera reservar una cita.')}">WhatsApp · ${esc(site.whatsappDisplay)}</a>
    </section>

    <section id="sobre-nosotros" class="seo-section">
      <div class="seo-kicker">Información del centro</div>
      <div class="seo-grid">
        <div><h2>Tratamientos estéticos y bienestar en Ecuador</h2><p>${esc(site.description)}</p><p>El catálogo reúne opciones de cuidado facial, tratamientos corporales, cuidado capilar y terapias relajantes. Cada servicio cuenta con una página individual donde puedes revisar objetivos estéticos, procedimiento general, duración aproximada, número de sesiones, cuidados y precio.</p></div>
        <div><h3>Tratamientos faciales</h3><p>Limpieza, hidratación, cuidado del tono, protocolos para acné, secuelas, anti age, rejuvenecimiento y otros servicios orientados al aspecto y bienestar de la piel.</p><h3>Tratamientos corporales y masajes</h3><p>Opciones para reducción de medidas, apariencia de celulitis, reafirmación, drenaje linfático y experiencias de masaje relajante, piedras calientes, bambú, pindas, reflexología y cocoterapia.</p></div>
      </div>
      <div class="seo-note"><strong>Importante:</strong> la información publicada es orientativa. La elección de determinados procedimientos puede requerir valoración previa y los resultados varían entre personas.</div>
    </section>
  </main>
  ${footer()}
</body>
</html>`;
}

function treatmentPage(t) {
  const cat = categoryMap[t.category];
  const related = data.treatments.filter(x => x.category === t.category && x.slug !== t.slug).slice(0, 3);
  const canonical = `${site.baseUrl}/tratamientos/${t.slug}/`;
  const title = `${t.name} | Precio, beneficios y reserva`;
  const description = `${t.name}: ${t.price} ${t.priceNote}. Conoce qué es, beneficios, cómo se realiza, duración, sesiones, cuidados y reserva por WhatsApp.`;
  const wa = whatsappUrl(`Hola, quisiera información y reservar ${t.name}. Vi que el precio es ${t.price} (${t.priceNote}).`);
  const img = treatmentImage(t);
  const schema = [
    organizationSchema,
    {'@context':'https://schema.org','@type':'Service',name:t.name,description:t.intro,provider:{'@type':'BeautySalon',name:site.brand,telephone:`+${site.whatsappInternational}`},areaServed:site.country,offers:{'@type':'Offer',priceCurrency:'USD',description:`${t.price} · ${t.priceNote}`,url:canonical},url:canonical},
    {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Inicio',item:site.baseUrl+'/'},{'@type':'ListItem',position:2,name:cat.name,item:site.baseUrl+'/#catalogo'},{'@type':'ListItem',position:3,name:t.name,item:canonical}]},
    {'@context':'https://schema.org','@type':'FAQPage',mainEntity:t.faqs.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))}
  ];

  return `${head({ title, description, canonical, ogTitle:t.name, ogDescription:description, schema, ogImage:img })}
<body>
  ${header()}
  <main>
    <nav class="breadcrumbs" aria-label="Ruta de navegación"><a href="/">Inicio</a><span>/</span><a href="/#catalogo">${esc(cat.name)}</a><span>/</span><span>${esc(t.name)}</span></nav>
    <section class="treatment-top">
      <div class="treatment-photo"><img src="${img}" alt="Imagen referencial de ${esc(t.name)}" width="1200" height="900"></div>
      <div class="treatment-summary">
        <p class="eyebrow">${esc(cat.eyebrow)}</p>
        <h1>${esc(t.name)}</h1>
        <p>${esc(t.intro.split('. ').slice(0,2).join('. '))}</p>
        <div class="summary-price"><span>${esc(t.priceNote)}</span><strong>${esc(t.price)}</strong></div>
        <a class="button" href="${wa}">Reservar por WhatsApp</a>
      </div>
    </section>

    <section class="treatment-facts">
      <div><span>Duración</span><strong>${esc(t.duration)}</strong></div>
      <div><span>Sesiones</span><strong>${esc(t.sessions)}</strong></div>
      <div><span>Reserva</span><strong>Con cita previa</strong></div>
    </section>

    <section class="article-layout">
      <article class="treatment-content">
        <section><p class="eyebrow">Sobre el tratamiento</p><h2>¿Qué es ${esc(t.name.toLowerCase())}?</h2><p>${esc(t.intro)}</p></section>
        <section><p class="eyebrow">Beneficios</p><h2>¿Qué puedes esperar?</h2><ul class="benefit-list">${t.benefits.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p class="note">Los resultados varían entre personas y dependen del estado inicial, hábitos, frecuencia de sesiones y respuesta individual.</p></section>
        <section id="como-se-realiza"><p class="eyebrow">La sesión</p><h2>¿Cómo se realiza?</h2><p>${esc(t.procedure)}</p></section>
        <section class="care-columns"><div><p class="eyebrow">Antes</p><h2>Cuidados previos</h2><ul class="check-list">${t.before.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div><p class="eyebrow">Después</p><h2>Cuidados posteriores</h2><ul class="check-list">${t.after.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></section>
        <section><p class="eyebrow">Resultados</p><h2>Antes y después</h2><p>Este espacio queda preparado para fotografías reales y autorizadas del centro.</p><div class="before-after"><div><span>Antes</span><strong>Fotografía real</strong></div><div><span>Después</span><strong>Fotografía real</strong></div></div></section>
        <section><p class="eyebrow">Preguntas frecuentes</p><h2>Dudas sobre ${esc(t.name.toLowerCase())}</h2><div class="faq-list">${t.faqs.map(([q,a],i)=>`<details ${i===0?'open':''}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></section>
        <section><p class="eyebrow">También puede interesarte</p><h2>Tratamientos relacionados</h2><div class="related-grid">${related.map(treatmentCard).join('')}</div></section>
      </article>
      <aside class="booking-card"><p class="eyebrow">Reserva directa</p><h2>${esc(t.name)}</h2><div class="booking-price"><strong>${esc(t.price)}</strong><span>${esc(t.priceNote)}</span></div><p>Se abrirá WhatsApp con el nombre del tratamiento.</p><a class="button" href="${wa}">Reservar ahora</a><small>${esc(site.whatsappDisplay)} · ${esc(site.hours)}</small></aside>
    </section>
  </main>
  ${footer()}
</body>
</html>`;
}

function notFoundPage() {
  return `${head({title:`Página no encontrada | ${site.brand}`,description:'La página que buscas no existe o cambió de dirección.',canonical:`${site.baseUrl}/404.html`})}<body>${header()}<main><section class="not-found"><p class="eyebrow">Error 404</p><h1>Esta página no está disponible.</h1><p>Regresa al catálogo de tratamientos.</p><a class="button" href="/#catalogo">Ver catálogo</a></section></main>${footer()}</body></html>`;
}

function build() {
  cleanDir(DIST);
  copyDir(PUBLIC, path.join(DIST, 'assets'));
  fs.copyFileSync(path.join(SRC,'styles.css'), path.join(DIST,'assets','styles.css'));
  fs.copyFileSync(path.join(SRC,'catalog.css'), path.join(DIST,'assets','catalog.css'));
  fs.copyFileSync(path.join(SRC,'client.js'), path.join(DIST,'assets','client.js'));
  write('index.html', homePage());
  for (const t of data.treatments) write(path.join('tratamientos', t.slug, 'index.html'), treatmentPage(t));
  write('404.html', notFoundPage());
  const urls = [`${site.baseUrl}/`, ...data.treatments.map(t => `${site.baseUrl}/tratamientos/${t.slug}/`)];
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${esc(u)}</loc></url>`).join('\n')}\n</urlset>`);
  write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.baseUrl}/sitemap.xml\n`);
  write('_headers', `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n`);
  write('manifest.webmanifest', JSON.stringify({name:site.brand,short_name:site.brand,start_url:withBasePath('/'),scope:withBasePath('/'),display:'standalone',background_color:'#f7f2ec',theme_color:'#6f5647',icons:[]}, null, 2));
  write('.nojekyll', '');
  console.log(`Sitio generado: ${data.treatments.length} páginas de tratamiento + inicio.`);
}

build();
if (process.argv.includes('--watch')) {
  console.log('Modo watch simple: reconstruyendo al detectar cambios en src/.');
  fs.watch(SRC, { recursive: true }, () => { try { build(); } catch (err) { console.error(err); } });
}
