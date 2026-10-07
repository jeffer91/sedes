# Centro Estético — sitio temporal

Sitio web estático, SEO-first, con una página individual por tratamiento.

## Qué incluye

- Página principal premium y responsive.
- 25 páginas individuales de tratamientos.
- Categorías: faciales, corporales, capilar, masajes y paquetes/experiencias.
- Reserva directa por WhatsApp al **097 921 0617** (`+593 979 210 617`).
- H1 único por tratamiento y estructura semántica con H2/H3.
- Meta title, meta description, canonical, Open Graph y JSON-LD.
- Schema `BeautySalon`, `Service`, `BreadcrumbList` y `FAQPage`.
- Sitemap y robots.txt generados automáticamente.
- Filtros y buscador de tratamientos en la página principal.
- Espacios preparados para fotografías reales y comparativas antes/después autorizadas.

## Desarrollo

Requiere Node.js 18 o superior.

```bash
npm run build
```

El sitio generado queda en `dist/`.

Para regenerar al editar archivos de `src/`:

```bash
npm run dev
```

## Publicación

La aplicación se publica automáticamente en GitHub Pages mediante GitHub Actions.

- **URL:** https://jeffer91.github.io/sedes/
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **SITE_URL:** `https://jeffer91.github.io/sedes`

Cada push a `main` ejecuta el workflow `.github/workflows/pages.yml`, genera el sitio y despliega `dist/` en GitHub Pages. El generador adapta automáticamente las rutas internas al subdirectorio `/sedes/`.

## Datos por completar antes del dominio oficial

En `src/data.json` se deben sustituir:

- `brand`: nombre comercial definitivo.
- `baseUrl`: dominio oficial, o usar `SITE_URL` en el hosting.
- `address`: dirección cuando esté confirmada.
- `instagram`: cuenta oficial.
- `hours`: horario definitivo.

También deben reemplazarse `public/logo.svg` y `public/hero.svg` por identidad visual y fotografías reales cuando estén disponibles.

## Tratamientos

Todo el catálogo, precios, textos SEO, beneficios, duración, cuidados y preguntas frecuentes está centralizado en `src/data.json`. Para modificar precios o contenidos no es necesario editar las plantillas HTML.
