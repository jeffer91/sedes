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

const categoryMap = Object.fromEntries(data.categories.map(c => [c.id, c]));

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
  fs.writeFileSync(full, content, 'utf8');
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

function head({ title, description, canonical, ogTitle = title, ogDescription = description, schema = [] }) {
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
  <meta property="og:image" content="${esc(site.baseUrl + '/assets/og-default.svg')}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#b28a63">
  <link rel="icon" href="/assets/logo.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/styles.css">
  ${schema.map(item => `<script type="application/ld+json">${jsonLd(item)}</script>`).join('\n  ')}
</head>`;
}

function header() {
  return `<header class="site-header">
    <a class="brand" href="/" aria-label="${esc(site.brand)} - Inicio">
      <img src="/assets/logo.svg" alt="" width="46" height="46">
      <span><strong>${esc(site.brand)}</strong><small>${esc(site.tagline)}</small></span>
    </a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav">Menú</button>
    <nav id="main-nav" class="main-nav" aria-label="Navegación principal">
      <a href="/#tratamientos">Tratamientos</a>
      <a href="/#experiencia">Experiencia</a>
      <a href="/#preguntas">Preguntas frecuentes</a>
      <a href="/#contacto">Contacto</a>
      <a class="button button-sm" href="${whatsappUrl('Hola, quisiera reservar una cita en el centro estético.')}">Reservar cita</a>
    </nav>
  </header>`;
}

function footer() {
  return `<footer id="contacto" class="site-footer">
    <div>
      <img src="/assets/logo.svg" alt="" width="52" height="52">
      <h2>${esc(site.brand)}</h2>
      <p>${esc(site.tagline)}</p>
    </div>
    <div>
      <h3>Contacto</h3>
      <p><a href="${whatsappUrl('Hola, quisiera información sobre sus tratamientos.')}">WhatsApp ${esc(site.whatsappDisplay)}</a></p>
      <p>${esc(site.hours)}</p>
      <p>${esc(site.country)}</p>
    </div>
    <div>
      <h3>Tratamientos</h3>
      ${data.categories.map(c => `<a href="/#${esc(c.id)}">${esc(c.name)}</a>`).join('')}
    </div>
    <div>
      <h3>Información</h3>
      <p>Los servicios estéticos se adaptan a valoración y necesidades individuales. La información del sitio no sustituye una evaluación médica.</p>
    </div>
  </footer>
  <div class="footer-bottom">© ${new Date().getFullYear()} ${esc(site.brand)} · Sitio informativo y de reservas</div>
  <a class="whatsapp-float" href="${whatsappUrl('Hola, quisiera información sobre sus tratamientos.')}">
    <span aria-hidden="true">✦</span> WhatsApp
  </a>
  <script src="/assets/client.js" defer></script>`;
}

function treatmentCard(t) {
  const cat = categoryMap[t.category];
  return `<article class="treatment-card" data-treatment-card data-category="${esc(t.category)}" data-search="${esc((t.name + ' ' + t.seoTerms.join(' ')).toLowerCase())}">
    <div class="card-topline"><span>${esc(cat.eyebrow)}</span><span>${esc(t.priceNote)}</span></div>
    <h3><a href="/tratamientos/${esc(t.slug)}/">${esc(t.name)}</a></h3>
    <p>${esc(t.intro.split('. ').slice(0, 2).join('. '))}</p>
    <div class="card-footer"><strong>${esc(t.price)}</strong><a href="/tratamientos/${esc(t.slug)}/">Ver tratamiento <span aria-hidden="true">→</span></a></div>
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

function homePage() {
  const title = `${site.brand} | Tratamientos faciales, corporales y masajes`;
  const canonical = `${site.baseUrl}/`;
  const faq = [
    ['¿Cómo reservo una cita?', `Puedes reservar directamente por WhatsApp al ${site.whatsappDisplay}. Los botones del sitio abren una conversación con el servicio ya identificado.`],
    ['¿Los precios publicados corresponden a una sesión o a un paquete?', 'Cada servicio indica si el valor corresponde a una sesión individual o a un paquete de varias sesiones.'],
    ['¿Cómo sé qué tratamiento elegir?', 'Si tienes dudas, puedes solicitar orientación antes de reservar. Algunos procedimientos requieren valoración previa y pueden no ser adecuados para todas las personas.'],
    ['¿Puedo ver resultados de antes y después?', 'Las páginas están preparadas para incorporar fotografías reales y autorizadas. No se publicarán comparaciones genéricas como si fueran resultados propios.']
  ];
  const schema = [
    organizationSchema,
    {'@context':'https://schema.org','@type':'WebSite',name:site.brand,url:site.baseUrl,inLanguage:'es-EC'},
    {'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(([q,a]) => ({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))}
  ];
  return `${head({ title, description: site.description, canonical, schema })}
<body>
  ${header()}
  <main>
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Estética · cuidado · bienestar</p>
        <h1>Tu cuidado merece una experiencia <em>hecha con detalle.</em></h1>
        <p class="hero-lead">Descubre tratamientos faciales, corporales, capilares y masajes con información clara, precios visibles y reserva directa por WhatsApp.</p>
        <div class="hero-actions">
          <a class="button" href="${whatsappUrl('Hola, quisiera reservar una cita en el centro estético.')}">Reservar por WhatsApp</a>
          <a class="text-link" href="#tratamientos">Explorar tratamientos <span aria-hidden="true">↓</span></a>
        </div>
        <ul class="trust-list">
          <li>Atención con cita previa</li>
          <li>Información clara de precios</li>
          <li>Protocolos según valoración</li>
        </ul>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <img src="/assets/hero.svg" alt="">
        <div class="hero-note"><span>25</span> tratamientos y experiencias</div>
      </div>
    </section>

    <section class="intro-strip" aria-label="Propuesta del centro">
      <p>Una web pensada para que encuentres <strong>qué tratamiento se adapta a lo que buscas</strong>, entiendas qué incluye y puedas reservar sin pasos innecesarios.</p>
    </section>

    <section id="tratamientos" class="section treatments-section">
      <div class="section-heading">
        <div><p class="eyebrow">Servicios</p><h2>Tratamientos por categoría</h2></div>
        <p>Explora cada servicio en su página individual: beneficios, procedimiento, duración, sesiones, cuidados, precio y preguntas frecuentes.</p>
      </div>

      <div class="filters" role="group" aria-label="Filtrar tratamientos">
        <button class="filter is-active" data-filter="all">Todos</button>
        ${data.categories.map(c => `<button class="filter" data-filter="${esc(c.id)}">${esc(c.name)}</button>`).join('')}
      </div>
      <label class="search-box">
        <span>Buscar tratamiento</span>
        <input id="treatment-search" type="search" placeholder="Ej. limpieza facial, masaje, acné…">
      </label>

      <div class="treatment-grid" id="treatment-grid">
        ${data.treatments.map(treatmentCard).join('\n')}
      </div>
      <p class="empty-state" id="empty-state" hidden>No encontramos un tratamiento con esos filtros. Escríbenos por WhatsApp y te orientamos.</p>
    </section>

    <section id="experiencia" class="section experience">
      <div class="experience-panel">
        <p class="eyebrow">Antes de reservar</p>
        <h2>Más que elegir un nombre de tratamiento</h2>
        <p>La piel, el cuerpo y los objetivos de cada persona son distintos. Por eso algunas sesiones se adaptan después de una valoración breve y ciertos procedimientos pueden requerir evaluación profesional específica.</p>
        <a class="button button-light" href="${whatsappUrl('Hola, no sé qué tratamiento elegir. ¿Me pueden orientar?')}">Quiero orientación</a>
      </div>
      <div class="experience-points">
        <article><span>01</span><h3>Información transparente</h3><p>Precios, número de sesiones y alcance del servicio visibles antes de contactar.</p></article>
        <article><span>02</span><h3>Expectativas realistas</h3><p>El contenido evita promesas absolutas y explica cuándo un resultado depende de valoración.</p></article>
        <article><span>03</span><h3>Reserva directa</h3><p>Cada página abre WhatsApp con el nombre del tratamiento para agilizar la conversación.</p></article>
      </div>
    </section>

    <section class="section gallery-teaser">
      <div>
        <p class="eyebrow">Resultados reales</p>
        <h2>Antes y después, cuando exista material propio</h2>
        <p>El sitio está preparado para incorporar fotografías reales del centro y comparativas autorizadas. Mientras no exista ese material, no mostramos imágenes genéricas como si fueran resultados.</p>
      </div>
      <div class="before-after" aria-label="Espacio reservado para resultados reales">
        <div><span>Antes</span><strong>Fotografía real</strong></div>
        <div><span>Después</span><strong>Fotografía real</strong></div>
      </div>
    </section>

    <section id="preguntas" class="section faq-section">
      <div class="section-heading"><div><p class="eyebrow">Resolvemos dudas</p><h2>Preguntas frecuentes</h2></div></div>
      <div class="faq-list">
        ${faq.map(([q,a],i) => `<details ${i===0?'open':''}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}
      </div>
    </section>

    <section class="cta-section">
      <p class="eyebrow">Reserva</p>
      <h2>¿Ya sabes qué tratamiento quieres?</h2>
      <p>Escríbenos y te ayudamos a coordinar tu cita.</p>
      <a class="button" href="${whatsappUrl('Hola, quisiera reservar una cita.')}">Hablar por WhatsApp · ${esc(site.whatsappDisplay)}</a>
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
  const schema = [
    organizationSchema,
    {'@context':'https://schema.org','@type':'Service',name:t.name,description:t.intro,provider:{'@type':'BeautySalon',name:site.brand,telephone:`+${site.whatsappInternational}`},areaServed:site.country,offers:{'@type':'Offer',priceCurrency:'USD',description:`${t.price} · ${t.priceNote}`,url:canonical},url:canonical},
    {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Inicio',item:site.baseUrl+'/'},{'@type':'ListItem',position:2,name:cat.name,item:site.baseUrl+'/#'+cat.id},{'@type':'ListItem',position:3,name:t.name,item:canonical}]},
    {'@context':'https://schema.org','@type':'FAQPage',mainEntity:t.faqs.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))}
  ];

  return `${head({ title, description, canonical, ogTitle:t.name, ogDescription:description, schema })}
<body>
  ${header()}
  <main>
    <nav class="breadcrumbs" aria-label="Ruta de navegación">
      <a href="/">Inicio</a><span>/</span><a href="/#${esc(cat.id)}">${esc(cat.name)}</a><span>/</span><span>${esc(t.name)}</span>
    </nav>

    <section class="treatment-hero">
      <div>
        <p class="eyebrow">${esc(cat.eyebrow)}</p>
        <h1>${esc(t.name)}</h1>
        <p class="treatment-intro">${esc(t.intro)}</p>
        <div class="price-box"><span>Precio</span><strong>${esc(t.price)}</strong><small>${esc(t.priceNote)}</small></div>
        <div class="hero-actions">
          <a class="button" href="${wa}">Reservar este tratamiento</a>
          <a class="text-link" href="#como-se-realiza">Ver cómo se realiza ↓</a>
        </div>
      </div>
      <div class="treatment-visual">
        <span>${esc(cat.name)}</span>
        <strong>${esc(t.name)}</strong>
        <small>Imagen real del tratamiento por incorporar</small>
      </div>
    </section>

    <section class="section article-layout">
      <article class="treatment-content">
        <section>
          <p class="eyebrow">En pocas palabras</p>
          <h2>¿Qué es ${esc(t.name.toLowerCase())}?</h2>
          <p>${esc(t.intro)}</p>
          <p>La sesión se plantea desde una mirada estética y de bienestar. Cuando existe una condición que necesita diagnóstico, seguimiento médico o un procedimiento regulado, la valoración profesional correspondiente tiene prioridad.</p>
        </section>

        <section>
          <p class="eyebrow">Objetivos estéticos</p>
          <h2>Beneficios y qué puedes esperar</h2>
          <ul class="benefit-list">${t.benefits.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
          <p class="note">Los resultados varían entre personas y dependen del estado inicial, hábitos, frecuencia de sesiones y respuesta individual. No se garantizan resultados idénticos.</p>
        </section>

        <section id="como-se-realiza">
          <p class="eyebrow">La sesión</p>
          <h2>¿Cómo se realiza el tratamiento?</h2>
          <p>${esc(t.procedure)}</p>
          <div class="fact-grid">
            <div><span>Duración aproximada</span><strong>${esc(t.duration)}</strong></div>
            <div><span>Sesiones</span><strong>${esc(t.sessions)}</strong></div>
          </div>
        </section>

        <section>
          <p class="eyebrow">Preparación</p>
          <h2>Cuidados antes del tratamiento</h2>
          <ul class="check-list">${t.before.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
        </section>

        <section>
          <p class="eyebrow">Después de la cita</p>
          <h2>Cuidados posteriores</h2>
          <ul class="check-list">${t.after.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
        </section>

        <section>
          <p class="eyebrow">Resultados</p>
          <h2>Antes y después</h2>
          <p>Este espacio está reservado para fotografías reales, comparables y autorizadas del centro. No se utilizarán imágenes de terceros para representar resultados propios.</p>
          <div class="before-after">
            <div><span>Antes</span><strong>Fotografía real</strong></div>
            <div><span>Después</span><strong>Fotografía real</strong></div>
          </div>
        </section>

        <section>
          <p class="eyebrow">Dudas frecuentes</p>
          <h2>Preguntas frecuentes sobre ${esc(t.name.toLowerCase())}</h2>
          <div class="faq-list">${t.faqs.map(([q,a],i)=>`<details ${i===0?'open':''}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
        </section>

        <section>
          <p class="eyebrow">Temas relacionados</p>
          <h2>También puede interesarte</h2>
          <p class="semantic-copy">Si estás comparando opciones de ${esc(cat.name.toLowerCase())}, esta página también se relaciona con ${esc(t.seoTerms.join(', '))}. La elección del servicio debe basarse en tu objetivo y valoración, no solo en el nombre comercial.</p>
          <div class="related-grid">${related.map(treatmentCard).join('')}</div>
        </section>
      </article>

      <aside class="booking-card">
        <p class="eyebrow">Reserva directa</p>
        <h2>${esc(t.name)}</h2>
        <div class="booking-price"><strong>${esc(t.price)}</strong><span>${esc(t.priceNote)}</span></div>
        <p>Al tocar el botón se abrirá WhatsApp con el nombre de este tratamiento y su precio.</p>
        <a class="button" href="${wa}">Reservar por WhatsApp</a>
        <small>${esc(site.whatsappDisplay)} · ${esc(site.hours)}</small>
      </aside>
    </section>

    <section class="cta-section">
      <p class="eyebrow">¿Necesitas orientación?</p>
      <h2>No tienes que elegir sola/o.</h2>
      <p>Cuéntanos qué te gustaría mejorar y te ayudamos a identificar qué opción revisar.</p>
      <a class="button" href="${whatsappUrl(`Hola, estoy revisando ${t.name}, pero quisiera orientación antes de reservar.`)}">Consultar por WhatsApp</a>
    </section>
  </main>
  ${footer()}
</body>
</html>`;
}

function notFoundPage() {
  return `${head({title:`Página no encontrada | ${site.brand}`,description:'La página que buscas no existe o cambió de dirección.',canonical:`${site.baseUrl}/404.html`})}<body>${header()}<main><section class="not-found"><p class="eyebrow">Error 404</p><h1>Esta página no está disponible.</h1><p>Regresa al catálogo de tratamientos o escríbenos para recibir orientación.</p><div class="hero-actions"><a class="button" href="/#tratamientos">Ver tratamientos</a><a class="text-link" href="${whatsappUrl('Hola, necesito ayuda para encontrar un tratamiento.')}">WhatsApp</a></div></section></main>${footer()}</body></html>`;
}

function build() {
  cleanDir(DIST);
  copyDir(PUBLIC, path.join(DIST, 'assets'));
  fs.copyFileSync(path.join(SRC,'styles.css'), path.join(DIST,'assets','styles.css'));
  fs.copyFileSync(path.join(SRC,'client.js'), path.join(DIST,'assets','client.js'));

  write('index.html', homePage());
  for (const t of data.treatments) write(path.join('tratamientos', t.slug, 'index.html'), treatmentPage(t));
  write('404.html', notFoundPage());

  const urls = [`${site.baseUrl}/`, ...data.treatments.map(t => `${site.baseUrl}/tratamientos/${t.slug}/`)];
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${esc(u)}</loc></url>`).join('\n')}\n</urlset>`);
  write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.baseUrl}/sitemap.xml\n`);
  write('_headers', `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n`);
  write('manifest.webmanifest', JSON.stringify({name:site.brand,short_name:site.brand,start_url:'/',display:'standalone',background_color:'#fbf8f3',theme_color:'#b28a63',icons:[]}, null, 2));
  console.log(`Sitio generado: ${data.treatments.length} páginas de tratamiento + inicio.`);
}

build();

if (process.argv.includes('--watch')) {
  console.log('Modo watch simple: reconstruyendo al detectar cambios en src/.');
  fs.watch(SRC, { recursive: true }, () => { try { build(); } catch (err) { console.error(err); } });
}
