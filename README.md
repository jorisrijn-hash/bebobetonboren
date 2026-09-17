# BEBO Betonboren & Zagen – website

Multi-page site met offerte-aanvraag (incl. foto's). Flask + Jinja, vanilla JS, één CSS-bestand,
plus losse Vite-bundels voor React Bits-componenten en de Leaflet-kaart.

## Pagina's
`/` · `/werkzaamheden` · `/werkzaamheden/<dienst>` (6) · `/werkgebied` · `/offerte` · `/bedankt`

## Lokaal draaien
```bash
pip install -r requirements.txt
python app.py            # → http://127.0.0.1:5000 (debug: placeholder-secties zichtbaar)
```

## Waar staat wat
```
content.py                 ALLE inhoud: bedrijfsgegevens, diensten, werkgebied, waarom,
                           werkwijze, projecten, cases, logo's, reviews
app.py                     routes, offerteformulier (velden per dienst), validatie,
                           opslag + e-mail, robots/sitemap, schematische kaart
templates/base.html        head/SEO, navigatie, mobiel menu, footer, mobiele contactbalk
templates/index.html       homepage
templates/werkzaamheden.html, dienst.html, werkgebied.html, offerte.html
frontend/                  Vite-bron: TargetCursor (React Bits) + kaart (Leaflet/PDOK)
static/bundle/             gebouwde bundels (gecommit; Flask serveert ze)
templates/_components.html media(), placeholders, casevelden, iconen
static/css/style.css       design system (tokens bovenin)
static/js/main.js          nav, reveals, formulierlogica, foto-upload
static/img/brand/          officieel logo (SVG, uit de stijlguide-PDF geëxtraheerd)
static/img/icons/          favicons (officieel merkteken)
static/img/social/         Open Graph-afbeelding (1200×630)
```

## Merk
Bron: BEBO stijlguide 1.0 (13-01-2025). Titillium Web · BEBO red `#D2051E` ·
dark gray `#3D3833` · concrete gray `#B2B2B2`. Het logo is 1-op-1 omgezet uit de
vectoren in de stijlguide; niet hertekenen of aanpassen.

## Content toevoegen (zodra de klant aanlevert)
- **Projectfoto's (Ons werk):** zet de foto in `static/img/werk/` en vul in
  `content.PROJECTS` `src`, `alt` (beschrijf wat zichtbaar is) en alleen bevestigde
  metadata. `position` stuurt de uitsnede (`object-position`).
- **Dienstfoto's:** `content.SERVICES[...]["media"]["src"]`.
- **Hero / Waarom-beeld:** zie de `CLIENT ASSET REQUIRED`-commentaren in `index.html`.
- **Projectcase:** kopieer `CASE_TEMPLATE` naar `CASES` en vul in. De sectie verschijnt
  automatisch.
- **Logo's / reviews:** `CLIENT_LOGOS`, `REVIEWS`, `REVIEW_RATING`. Alleen echte content.

## Mediaslots zonder foto (MediaPlaceholderBlock)
Elk beeldvlak zonder klantfoto toont `media_placeholder_block()` uit `templates/_components.html`:
label + korte beschrijving van welke foto er hoort, daarboven een wireframe-vlak met
`static/img/placeholder/media-placeholder.svg` (nooit vervormd, `object-fit: contain`).
- Andere placeholder-afbeelding? Vervang dat bestand (zelfde pad) of geef `img=` mee.
- Teksten per slot: in de `media(...)`-aanroepen, of `placeholder_title` / `placeholder_desc`
  in `content.PROJECTS`.
- Zodra `src` gevuld is, verschijnt de echte foto (met wireframe-laadstaat tot hij geladen is).

## Placeholder-secties
Projectcase, opdrachtgevers en reviews zijn verborgen tot er echte content is. Voor review:
`SHOW_PLACEHOLDERS=1`, `?placeholders=1` achter de URL, of lokaal in debug.
"Ons werk" toont altijd nette placeholders zolang er geen foto's zijn.

## Offerteformulier
- Eerst de werkzaamheid, daarna alleen de relevante vragen, foto's en contactgegevens.
- Foto's (JPG/PNG/HEIC, max. 10) worden in de browser verkleind en als bijlage gemaild.
- **Succes wordt alleen getoond als de aanvraag echt is afgeleverd:** e-mail verzonden, of
  opgeslagen op een persistente schijf. Op Vercel (niet-persistent) is SMTP dus verplicht;
  zonder SMTP krijgt de bezoeker een foutmelding met het telefoonnummer.
- Zet in productie: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`,
  `MAIL_TO` (zie `.env.example`).

## SEO
- `SITE_URL` bepaalt canonical, OG-URL's, sitemap en JSON-LD (standaard
  `https://bebobetonboren.nl` – bevestigen!).
- Vercel-previews en `NOINDEX=1` krijgen automatisch noindex (meta, header en robots.txt).
- JSON-LD `GeneralContractor` met uitsluitend bevestigde gegevens (geen ratings,
  openingstijden of prijsklasse).

## Deploy
- **Railway/Docker:** `Dockerfile` / `Procfile` (`gunicorn app:app`). Let op: ook Railway
  heeft zonder volume geen persistente schijf – gebruik SMTP.
- **Vercel:** Flask-runtime. Requestlimiet ±4,5 MB; de upload is daarom client-side
  beperkt tot 4 MB totaal.

## Frontend-bundels (React Bits + kaart)
```bash
cd frontend && npm install && npm run build   # → static/bundle/ (gecommit)
```
Elke bundel laadt alleen waar hij nodig is:

| Bundel | Component | Waar | Wanneer |
|---|---|---|---|
| `nav.js` | React Bits **CardNav** | alle pagina's | desktop ≥1101px (server rendert identieke markup vooraf) |
| `cursor.js` | React Bits **TargetCursor** | alle pagina's | muis/trackpad, geen reduced motion |
| `velocity.js` | React Bits **ScrollVelocity** | home, tussen Ons werk en Werkzaamheden | in beeld, geen reduced motion; pauzeert buiten beeld |
| `spotlight.js` | React Bits **SpotlightCard** | CTA-kaarten (home, werkzaamheden, dienstpagina's, werkgebied) | muis/trackpad; op touch blijft de statische kaart |
| `shapeblur.js` | React Bits **ShapeBlur** (three.js) | alleen laatste CTA op home | desktop met muis, geen reduced motion; pauzeert buiten beeld |
| `map.js` | Leaflet + PDOK BRT-Achtergrondkaart | home, /werkgebied | zodra de kaart in beeld komt |

De originele React Bits-bestanden staan in `frontend/src/components/`; aanpassingen zijn
in de bestanden gemarkeerd (BEBO). Styling van de componenten staat in `static/css/style.css`,
zodat de server-gerenderde versie er vóór het laden al hetzelfde uitziet.
Coördinaten (PDOK Locatieserver) staan in `content.HQ` en `content.WORK_AREAS`.
