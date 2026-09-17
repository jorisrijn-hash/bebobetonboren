# BEBO Betonboren & Zagen – website

Multi-page site met offerte-aanvraag (incl. foto's). Flask + Jinja, vanilla JS, één CSS-bestand,
plus twee kleine Vite-bundels (React Bits TargetCursor en de Leaflet-kaart).

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

## Frontend-bundels herbouwen
```bash
cd frontend && npm install && npm run build   # → static/bundle/
```
- `cursor.js`: React Bits TargetCursor, alleen geladen bij muis/trackpad en zonder reduced motion.
- `map.js`: Leaflet + PDOK BRT-Achtergrondkaart (grijs), lazy geladen zodra de kaart in beeld komt.
  Coördinaten (PDOK Locatieserver) staan in `content.HQ` en `content.WORK_AREAS`.
