"""
BEBO Betonboren & Zagen - Flask website
----------------------------------------
Een lead-genererende multi-page site met een offerte-aanvraag als kern.
Alle inhoud staat in content.py.

Deployment
- Railway/Docker: `gunicorn app:app` (Procfile / Dockerfile).
- Vercel: werkt met de Flask-runtime; het bestandssysteem is daar niet
  persistent, dus een aanvraag telt pas als verzonden als de e-mail via SMTP
  daadwerkelijk is afgeleverd (zie _deliver_lead).

Omgevingsvariabelen (zie .env.example)
- SITE_URL            canonieke domeinnaam, bijv. https://bebobetonboren.nl
- SECRET_KEY          willekeurige string
- SMTP_HOST/PORT/USER/PASS/FROM, MAIL_TO   e-mail van offerte-aanvragen
- NOINDEX=1           zet de site op noindex (staging); Vercel-previews
                      krijgen automatisch noindex.
- SHOW_PLACEHOLDERS   1/0: toon placeholder-secties (projectcase, logo's,
                      reviews). Standaard aan in debug en op previews.
- MAX_UPLOAD_MB       maximale requestgrootte voor foto's (standaard 25)
"""

import datetime
import json
import os
import smtplib
import uuid
from email.message import EmailMessage
from pathlib import Path

from flask import (
    Flask,
    abort,
    Response,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    send_from_directory,
    url_for,
)
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.utils import secure_filename

import content

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "verander-mij-in-productie")
app.config["MAX_CONTENT_LENGTH"] = int(os.environ.get("MAX_UPLOAD_MB", "25")) * 1024 * 1024

# Canonieke site-URL (canonical, Open Graph, sitemap, JSON-LD).
# TODO(domein): bevestigen dat bebobetonboren.nl (zonder www) het live domein wordt.
SITE_URL = os.environ.get("SITE_URL", "https://bebobetonboren.nl").rstrip("/")
VERCEL_ENV = os.environ.get("VERCEL_ENV", "")
NOINDEX = os.environ.get("NOINDEX") == "1" or VERCEL_ENV in ("preview", "development")
# Serverless-omgevingen (Vercel) bewaren geschreven bestanden niet.
EPHEMERAL_FS = bool(os.environ.get("VERCEL"))

STATIC_DIR = Path(app.static_folder)


def _data_dir() -> Path:
    """data/ naast de app; valt terug op /tmp als die map niet schrijfbaar is."""
    preferred = Path(__file__).parent / "data"
    try:
        preferred.mkdir(exist_ok=True)
        probe = preferred / ".write-test"
        probe.touch()
        probe.unlink()
        return preferred
    except OSError:
        fallback = Path("/tmp/bebo-data")
        fallback.mkdir(exist_ok=True)
        return fallback


DATA_DIR = _data_dir()
LEADS_FILE = DATA_DIR / "leads.jsonl"
UPLOADS_DIR = DATA_DIR / "uploads"
INTAKE_FILE = DATA_DIR / "intake.jsonl"

# ---------------------------------------------------------------------------
# Offerteformulier - velden per werkzaamheid (progressive disclosure)
# ---------------------------------------------------------------------------
MATERIALS = ["Beton", "Steen", "Metselwerk", "Onbekend"]

SERVICE_FIELDS = {
    "betonboren": [
        {"name": "aantal_gaten", "label": "Aantal gaten", "type": "number", "placeholder": "bijv. 4"},
        {"name": "diameter", "label": "Gewenste diameter", "type": "text", "placeholder": "bijv. Ø 110 mm"},
        {"name": "materiaal", "label": "Materiaal", "type": "radio", "options": MATERIALS},
        {"name": "binnen_buiten", "label": "Binnen of buiten", "type": "radio", "options": ["Binnen", "Buiten"]},
    ],
    "wandzagen": [
        {"name": "afmeting_opening", "label": "Afmeting opening", "type": "text", "placeholder": "breedte × hoogte, bijv. 90 × 210 cm"},
        {"name": "wanddikte", "label": "Wanddikte", "type": "text", "placeholder": "bijv. 20 cm", "optional": True},
        {"name": "materiaal", "label": "Materiaal", "type": "radio", "options": MATERIALS},
    ],
    "vloerzagen": [
        {"name": "afmeting_uitsparing", "label": "Afmeting uitsparing", "type": "text", "placeholder": "bijv. 100 × 250 cm"},
        {"name": "vloerdikte", "label": "Vloerdikte", "type": "text", "placeholder": "bijv. 25 cm", "optional": True},
    ],
    "sleuven-frezen": [
        {"name": "lengte", "label": "Geschatte lengte", "type": "text", "placeholder": "bijv. 12 meter"},
        {"name": "toepassing", "label": "Gewenste sleuf / toepassing", "type": "text", "placeholder": "bijv. sleuf voor elektra, 3 × 3 cm"},
        {"name": "materiaal", "label": "Materiaal", "type": "radio", "options": MATERIALS, "optional": True},
    ],
    "precisiesloop": [
        {"name": "wat_verwijderen", "label": "Wat moet verwijderd worden?", "type": "text", "placeholder": "bijv. betonvloer badkamer"},
        {"name": "afmeting", "label": "Geschatte afmeting", "type": "text", "placeholder": "bijv. 3 × 2 m"},
        {"name": "puinafvoer", "label": "Puinafvoer nodig?", "type": "radio", "options": ["Ja", "Nee", "Weet ik niet"], "optional": True},
    ],
    "ankers-verlijmen": [
        {"name": "aantal_ankers", "label": "Aantal ankers / stekken", "type": "number", "placeholder": "bijv. 12", "optional": True},
        {"name": "toepassing_ankers", "label": "Toepassing / korte omschrijving", "type": "textarea", "placeholder": "Wat moet er verankerd worden, en waarin?"},
    ],
    "anders": [
        {"name": "omschrijving", "label": "Wat moet er gebeuren?", "type": "textarea", "placeholder": "Beschrijf kort de klus. Weet je het niet precies? Foto's helpen."},
    ],
}

FORM_SERVICES = [{"id": s["id"], "index": s["index"], "title": s["title"], "spec": s["spec"]} for s in content.SERVICES] + [content.FORM_OTHER]
FORM_SERVICE_LABELS = {s["id"]: s["title"] for s in FORM_SERVICES}

PHOTO_EXTENSIONS = {"jpg", "jpeg", "png", "heic", "heif", "webp"}
MAX_PHOTOS = 10
MAX_PHOTO_BYTES = 12 * 1024 * 1024


# ---------------------------------------------------------------------------
# Template-globals
# ---------------------------------------------------------------------------
def show_placeholders() -> bool:
    if request.args.get("placeholders") == "1":
        return True
    env = os.environ.get("SHOW_PLACEHOLDERS")
    if env is not None:
        return env == "1"
    return app.debug or VERCEL_ENV in ("preview", "development")


_STATIC_HASHES = {}


def static_v(filename: str) -> str:
    """url_for('static') met ?v=<inhoudshash>. Een hash i.p.v. mtime: op Vercel
    hebben alle bestanden dezelfde mtime, waardoor browsers oude CSS/JS bleven
    gebruiken. De hash verandert alleen als de inhoud verandert."""
    import hashlib

    path = STATIC_DIR / filename
    try:
        stat = path.stat()
    except OSError:
        return url_for("static", filename=filename)
    key = (filename, stat.st_mtime_ns, stat.st_size)
    version = _STATIC_HASHES.get(key)
    if version is None:
        version = hashlib.sha1(path.read_bytes()).hexdigest()[:10]
        _STATIC_HASHES[key] = version
    return url_for("static", filename=filename, v=version)


def nav_cards():
    """Kaarten voor de React Bits CardNav (desktop) en het mobiele menu.
    Eén bron, echte routes, actieve pagina gemarkeerd."""
    ep = request.endpoint
    slug = (request.view_args or {}).get("slug")
    services = [
        {"index": s["index"], "label": s["title"], "href": url_for("dienst", slug=s["id"]),
         "current": ep == "dienst" and slug == s["id"]}
        for s in content.SERVICES
    ]
    company_links = [
        {"label": "Alle werkzaamheden", "href": url_for("werkzaamheden"), "current": ep == "werkzaamheden"},
        {"label": "Waarom BEBO", "href": url_for("index") + "#waarom", "current": False},
        {"label": "Werkgebied", "href": url_for("werkgebied"), "current": ep == "werkgebied"},
        {"label": "Contact", "href": url_for("offerte_page") + "#contact", "current": False},
    ]
    actions = [
        {"label": "Offerte aanvragen", "href": url_for("offerte_page"), "current": ep == "offerte_page"},
        {"label": "Bel direct", "href": "tel:" + content.COMPANY["phone_tel"], "current": False},
        {"label": "WhatsApp", "href": content.COMPANY["whatsapp_url"], "current": False, "external": True},
    ]
    return [
        {"label": "Werkzaamheden", "tone": "red", "links": services},
        {"label": "Bedrijf", "tone": "dark", "links": company_links},
        {"label": "Actie", "tone": "concrete", "links": actions},
    ]


@app.context_processor
def inject_globals():
    return {
        "site_url": SITE_URL,
        "noindex": NOINDEX,
        "company": content.COMPANY,
        "services": content.SERVICES,
        "hq_geo": content.HQ,
        "all_work_areas": content.WORK_AREAS,
        "static_v": static_v,
        "current_year": datetime.date.today().year,
        "nav_cards": nav_cards,
    }


@app.after_request
def robots_header(response):
    if NOINDEX:
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
    return response


# ---------------------------------------------------------------------------
# Leads: opslaan + e-mailen
# ---------------------------------------------------------------------------
def _save_lead(lead: dict, photos: list) -> bool:
    """Schrijf de lead weg (append-only) en bewaar foto's. Geeft True bij succes."""
    try:
        if photos:
            target = UPLOADS_DIR / lead["id"]
            target.mkdir(parents=True, exist_ok=True)
            for p in photos:
                (target / p["filename"]).write_bytes(p["data"])
        with LEADS_FILE.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(lead, ensure_ascii=False) + "\n")
        return True
    except OSError as exc:
        app.logger.error("Lead opslaan mislukt: %s", exc)
        return False


def _format_lead(lead: dict) -> str:
    lines = [
        "Nieuwe offerteaanvraag via de website",
        "",
        "WERKZAAMHEID",
        "  " + FORM_SERVICE_LABELS.get(lead["dienst"], lead["dienst"]),
    ]
    for label, value in lead["details"]:
        lines.append("  {}: {}".format(label, value))
    c = lead["contact"]
    lines += [
        "",
        "CONTACT",
        "  Naam:       " + c["naam"],
        "  Bedrijf:    " + (c["bedrijf"] or "-"),
        "  Telefoon:   " + c["telefoon"],
        "  E-mail:     " + c["email"],
        "  Locatie:    {} {}".format(c["postcode"], c["plaats"]),
        "  Uitvoering: " + (c["datum"] or "Niet opgegeven"),
        "",
        "TOELICHTING",
        "  " + (c["toelichting"] or "-"),
        "",
        "Foto's: {}".format(len(lead["fotos"])),
        "Ontvangen: " + lead["ontvangen"],
        "Referentie: " + lead["id"],
    ]
    return "\n".join(lines)


def _email_lead(lead: dict, photos: list):
    """Stuur de aanvraag (met foto's als bijlage) per mail.
    Returns True (verzonden), False (mislukt) of None (SMTP niet ingesteld)."""
    host = os.environ.get("SMTP_HOST")
    if not host:
        return None
    try:
        msg = EmailMessage()
        dienst = FORM_SERVICE_LABELS.get(lead["dienst"], lead["dienst"])
        msg["Subject"] = "Offerteaanvraag {} - {} ({})".format(
            dienst, lead["contact"]["naam"], lead["contact"]["plaats"]
        )
        msg["From"] = os.environ.get("SMTP_FROM", os.environ["SMTP_USER"])
        msg["To"] = os.environ.get("MAIL_TO", content.COMPANY["email"])
        msg["Reply-To"] = lead["contact"]["email"]
        msg.set_content(_format_lead(lead))
        for p in photos:
            maintype, _, subtype = p["mimetype"].partition("/")
            msg.add_attachment(p["data"], maintype=maintype or "application",
                               subtype=subtype or "octet-stream", filename=p["filename"])
        with smtplib.SMTP(host, int(os.environ.get("SMTP_PORT", 587)), timeout=20) as s:
            s.starttls()
            s.login(os.environ["SMTP_USER"], os.environ["SMTP_PASS"])
            s.send_message(msg)
        return True
    except Exception as exc:  # noqa: BLE001
        app.logger.error("E-mail offerteaanvraag mislukt: %s", exc)
        return False


def _deliver_lead(lead: dict, photos: list) -> bool:
    """True alleen als BEBO de aanvraag daadwerkelijk kan inzien:
    - de e-mail is verzonden, of
    - de lead staat op een persistent bestandssysteem (niet op Vercel)."""
    saved = _save_lead(lead, photos)
    emailed = _email_lead(lead, photos)
    if emailed:
        return True
    return saved and not EPHEMERAL_FS


# ---------------------------------------------------------------------------
# Validatie offerte
# ---------------------------------------------------------------------------
def _clean(name: str, limit: int = 500) -> str:
    return (request.form.get(name) or "").strip()[:limit]


def _validate_offerte():
    errors = {}
    dienst = _clean("dienst", 40)
    if dienst not in FORM_SERVICE_LABELS:
        errors["dienst"] = "Kies wat er moet gebeuren."

    details = []
    # Veldnamen zijn per dienst geprefixt (bijv. "betonboren__materiaal"),
    # zodat gelijknamige velden van verschillende diensten nooit botsen.
    for field in SERVICE_FIELDS.get(dienst, []):
        key = "{}__{}".format(dienst, field["name"])
        value = _clean(key, 2000 if field["type"] == "textarea" else 200)
        if value:
            details.append((field["label"], value))
        elif dienst == "anders" and field["name"] == "omschrijving":
            errors[key] = "Beschrijf kort wat er moet gebeuren."

    contact = {
        "naam": _clean("naam", 120),
        "bedrijf": _clean("bedrijf", 120),
        "telefoon": _clean("telefoon", 40),
        "email": _clean("email", 160),
        "postcode": _clean("postcode", 10).upper(),
        "plaats": _clean("plaats", 80),
        "datum": _clean("datum", 40),
        "toelichting": _clean("toelichting", 3000),
    }
    if len(contact["naam"]) < 2:
        errors["naam"] = "Vul je naam in."
    digits = "".join(ch for ch in contact["telefoon"] if ch.isdigit())
    if len(digits) < 9:
        errors["telefoon"] = "Vul een geldig telefoonnummer in."
    if "@" not in contact["email"] or "." not in contact["email"].split("@")[-1]:
        errors["email"] = "Vul een geldig e-mailadres in."
    pc = contact["postcode"].replace(" ", "")
    if not (len(pc) == 6 and pc[:4].isdigit() and pc[4:].isalpha()):
        errors["postcode"] = "Vul een geldige postcode in, bijv. 2651 BC."
    else:
        contact["postcode"] = pc[:4] + " " + pc[4:]
    if len(contact["plaats"]) < 2:
        errors["plaats"] = "Vul de plaats van de klus in."

    photos = []
    files = [f for f in request.files.getlist("fotos") if f and f.filename]
    if len(files) > MAX_PHOTOS:
        errors["fotos"] = "Maximaal {} foto's per aanvraag.".format(MAX_PHOTOS)
    for i, f in enumerate(files[:MAX_PHOTOS], 1):
        ext = f.filename.rsplit(".", 1)[-1].lower() if "." in f.filename else ""
        if ext not in PHOTO_EXTENSIONS:
            errors["fotos"] = "Alleen JPG, PNG of HEIC-foto's zijn mogelijk."
            break
        data = f.read(MAX_PHOTO_BYTES + 1)
        if len(data) > MAX_PHOTO_BYTES:
            errors["fotos"] = "Een van de foto's is te groot (max. 12 MB per foto)."
            break
        name = secure_filename(f.filename) or "foto.{}".format(ext)
        photos.append({
            "filename": "{:02d}-{}".format(i, name),
            "mimetype": f.mimetype or "application/octet-stream",
            "data": data,
        })
    return dienst, details, contact, photos, errors


def _wants_json() -> bool:
    return "application/json" in request.headers.get("Accept", "")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.route("/favicon.ico")
def favicon():
    return send_from_directory(app.static_folder + "/img/icons", "favicon.ico",
                               mimetype="image/vnd.microsoft.icon")


@app.route("/site.webmanifest")
def webmanifest():
    return send_from_directory(app.static_folder, "site.webmanifest",
                               mimetype="application/manifest+json")


# ---------------------------------------------------------------------------
# Pagina's: één bron voor routes, navigatie-status, SEO en sitemap
# ---------------------------------------------------------------------------
SITE_NAME = content.COMPANY["name"]


def _page(title, description, nav, breadcrumbs=None, og_type="website"):
    """Metadata per pagina. title is de volledige <title>."""
    return {
        "title": title,
        "description": description,
        "nav": nav,
        "breadcrumbs": breadcrumbs or [],
        "og_type": og_type,
    }


def public_routes():
    """Alle openbare URL's (sitemap). Placeholder- of interne routes horen hier niet."""
    urls = ["/", url_for("werkzaamheden"), url_for("werkgebied"), url_for("offerte_page")]
    urls += [url_for("dienst", slug=s["id"]) for s in content.SERVICES]
    return urls


def _map_data():
    return {"hq": content.HQ, "places": content.WORK_AREAS}


def _common():
    return {
        "why": content.WHY,
        "experience": content.EXPERIENCE,
        "work_areas": content.WORK_AREAS,
        "hq": content.HQ,
        "map_data": _map_data(),
        "show_placeholders": show_placeholders(),
    }


@app.route("/robots.txt")
def robots():
    if NOINDEX:
        body = "User-agent: *\nDisallow: /\n"
    else:
        body = (
            "User-agent: *\nAllow: /\nDisallow: /intake\nDisallow: /bedankt\n\n"
            "Sitemap: {}/sitemap.xml\n".format(SITE_URL)
        )
    return Response(body, mimetype="text/plain")


@app.route("/sitemap.xml")
def sitemap():
    today = datetime.date.today().isoformat()
    rows = "".join(
        "  <url><loc>{}{}</loc><lastmod>{}</lastmod></url>\n".format(SITE_URL, u, today)
        for u in public_routes()
    )
    body = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + rows + "</urlset>\n"
    )
    return Response(body, mimetype="application/xml")


@app.route("/")
def index():
    return render_template(
        "index.html",
        page=_page(
            "BEBO Betonboren & Zagen | Berkel en Rodenrijs & regio Rotterdam",
            "BEBO Betonboren & Zagen uit Berkel en Rodenrijs: betonboren, wand- en vloerzagen, "
            "frezen en precisiesloop in Rotterdam en regio. Schoon werk, strak resultaat.",
            nav="home",
        ),
        hero_intro=content.HERO_INTRO,
        projects=content.PROJECTS,
        cases=content.CASES,
        case_template=content.CASE_TEMPLATE,
        client_logos=content.CLIENT_LOGOS,
        reviews=content.REVIEWS,
        review_rating=content.REVIEW_RATING,
        placeholder_logo_slots=content.PLACEHOLDER_LOGO_SLOTS,
        placeholder_review_slots=content.PLACEHOLDER_REVIEW_SLOTS,
        **_common(),
    )


@app.route("/werkzaamheden")
def werkzaamheden():
    return render_template(
        "werkzaamheden.html",
        page=_page(
            "Werkzaamheden | BEBO Betonboren & Zagen",
            "Betonboren, wandzagen, vloerzagen, sleuven & frezen, precisiesloop en ankers & "
            "verlijmen in beton en steen. BEBO uit Berkel en Rodenrijs.",
            nav="werkzaamheden",
            breadcrumbs=[("Werkzaamheden", None)],
        ),
        **_common(),
    )


@app.route("/werkzaamheden/<slug>")
def dienst(slug):
    service = content.SERVICE_BY_ID.get(slug)
    if not service:
        abort(404)
    related = [content.SERVICE_BY_ID[r] for r in service["related"]]
    return render_template(
        "dienst.html",
        page=_page(
            "{} | {}".format(service["title"], SITE_NAME),
            service["meta_description"],
            nav="werkzaamheden",
            breadcrumbs=[("Werkzaamheden", url_for("werkzaamheden")), (service["title"], None)],
        ),
        service=service,
        related=related,
        **_common(),
    )


@app.route("/werkgebied")
def werkgebied():
    return render_template(
        "werkgebied.html",
        page=_page(
            "Werkgebied | BEBO Betonboren & Zagen",
            "BEBO Betonboren & Zagen werkt vanuit Berkel en Rodenrijs in Rotterdam, "
            "Lansingerland, Pijnacker, Delft, Den Haag en Zoetermeer.",
            nav="werkgebied",
            breadcrumbs=[("Werkgebied", None)],
        ),
        **_common(),
    )


@app.route("/offerte", methods=["GET"])
def offerte_page():
    return render_template(
        "offerte.html",
        page=_page(
            "Offerte aanvragen | BEBO Betonboren & Zagen",
            "Vraag een offerte aan voor betonboren, zagen, frezen, precisiesloop of ankers. "
            "Stuur foto's mee, dan kunnen we de klus sneller inschatten.",
            nav="offerte",
            breadcrumbs=[("Offerte aanvragen", None)],
        ),
        process=content.PROCESS,
        form_services=FORM_SERVICES,
        service_fields=SERVICE_FIELDS,
        max_photos=MAX_PHOTOS,
        upload_limit_mb=4 if EPHEMERAL_FS else max(1, app.config["MAX_CONTENT_LENGTH"] // (1024 * 1024) - 1),
        preselect=request.args.get("dienst", ""),
        **_common(),
    )


@app.route("/offerte", methods=["POST"])
def offerte():
    # Honeypot: bots vullen dit verborgen veld in, mensen niet.
    if request.form.get("website"):
        if _wants_json():
            return jsonify(ok=True, redirect=url_for("bedankt"))
        return redirect(url_for("bedankt"))

    dienst_id, details, contact, photos, errors = _validate_offerte()
    if errors:
        if _wants_json():
            return jsonify(ok=False, errors=errors), 400
        flash("Niet alle velden zijn goed ingevuld: " + " ".join(errors.values()), "error")
        return redirect(url_for("offerte_page") + "#formulier")

    lead = {
        "id": datetime.datetime.now().strftime("%Y%m%d-%H%M%S-") + uuid.uuid4().hex[:6],
        "dienst": dienst_id,
        "details": details,
        "contact": contact,
        "fotos": [p["filename"] for p in photos],
        "ontvangen": datetime.datetime.now().isoformat(timespec="seconds"),
        "bron": request.headers.get("Referer", "direct"),
    }

    if not _deliver_lead(lead, photos):
        message = (
            "Je aanvraag kon niet worden verzonden. Probeer het later opnieuw, "
            "of bel of app ons direct op {}.".format(content.COMPANY["phone"])
        )
        if _wants_json():
            return jsonify(ok=False, error=message), 503
        flash(message, "error")
        return redirect(url_for("offerte_page") + "#formulier")

    if _wants_json():
        # reference = het echte aanvraag-ID dat ook in de mail en leads.jsonl staat.
        return jsonify(ok=True, redirect=url_for("bedankt"), reference=lead["id"])
    return redirect(url_for("bedankt"))


@app.errorhandler(RequestEntityTooLarge)
def too_large(_e):
    message = "De foto's zijn samen te groot. Verklein ze of stuur ze via WhatsApp."
    if _wants_json():
        return jsonify(ok=False, errors={"fotos": message}), 413
    flash(message, "error")
    return redirect(url_for("offerte_page") + "#formulier")


# ---------------------------------------------------------------------------
# Content-intake (intern hulpmiddel voor de klant, noindex)
# ---------------------------------------------------------------------------
def _save_intake(record: dict) -> None:
    with INTAKE_FILE.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(record, ensure_ascii=False) + "\n")


def _format_intake(data: dict) -> str:
    b = data.get("bedrijf") or {}
    out = []
    add = out.append
    add("Nieuwe content-intake via de website\n")
    add("== BEDRIJF & CONTACT ==")
    add("Naam:        " + (b.get("naam") or "-"))
    if b.get("ondertitel"):
        add("Ondertitel:  " + b["ondertitel"])
    add("Telefoon:    " + (b.get("tel") or "-"))
    add("WhatsApp:    " + (b.get("whatsapp") or "(zelfde als telefoon)"))
    add("E-mail:      " + (b.get("email") or "-"))
    adres = ", ".join(x for x in [b.get("straat"), b.get("postcode_plaats")] if x)
    add("Adres:       " + (adres or "-"))
    if b.get("kvk"):
        add("KvK:         " + b["kvk"])
    if b.get("openingstijden"):
        add("Openingstijden: " + b["openingstijden"])

    diensten = data.get("diensten") or []
    add("\n== WERKZAAMHEDEN (%d) ==" % len(diensten))
    for i, s in enumerate(diensten, 1):
        spec = ("  [" + s["spec"] + "]") if s.get("spec") else ""
        add("%d. %s%s" % (i, s.get("titel") or "(naam?)", spec))
        if s.get("tekst"):
            add("   " + s["tekst"])

    w = data.get("werkgebied") or {}
    add("\n== WERKGEBIED ==")
    add("Plaatsen: " + (w.get("plaatsen") or "-"))
    if w.get("tekst"):
        add("Toelichting: " + w["tekst"])

    add("\n== WAAROM WIJ ==")
    for p in (data.get("waarom") or []):
        add("- " + (p.get("kop") or "") + ((": " + p["tekst"]) if p.get("tekst") else ""))

    o = data.get("over") or {}
    add("\n== OVER ==")
    add(o.get("omschrijving") or "-")
    if o.get("ervaring"):
        add("Ervaring: " + o["ervaring"])
    if o.get("team"):
        add("Ploeg: " + o["team"])

    kop = data.get("kop") or {}
    if kop.get("titel") or kop.get("lede"):
        add("\n== KOPTEKST (voorkeur klant) ==")
        if kop.get("titel"):
            add("Kop: " + kop["titel"])
        if kop.get("lede"):
            add("Intro: " + kop["lede"])
    return "\n".join(out)


def _email_intake(data: dict) -> None:
    host = os.environ.get("SMTP_HOST")
    if not host:
        return
    try:
        msg = EmailMessage()
        naam = (data.get("bedrijf") or {}).get("naam") or "onbekend bedrijf"
        msg["Subject"] = "Website-content ingevuld - " + naam
        msg["From"] = os.environ.get("SMTP_FROM", os.environ["SMTP_USER"])
        msg["To"] = os.environ.get("INTAKE_MAIL_TO", os.environ.get("SMTP_USER", ""))
        msg.set_content(_format_intake(data) + "\n\n--\nDe volledige JSON zit als bijlage.")
        msg.add_attachment(
            json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8"),
            maintype="application", subtype="json", filename="content.json",
        )
        with smtplib.SMTP(host, int(os.environ.get("SMTP_PORT", 587)), timeout=20) as s:
            s.starttls()
            s.login(os.environ["SMTP_USER"], os.environ["SMTP_PASS"])
            s.send_message(msg)
    except Exception as exc:  # noqa: BLE001
        app.logger.warning("Intake-mail mislukt: %s", exc)


@app.route("/intake", methods=["GET", "POST"])
def intake():
    if request.method == "GET":
        return render_template("intake.html")
    payload = request.get_json(silent=True) or {}
    if payload.get("website"):  # honeypot
        return {"ok": True}
    data = payload.get("data")
    if not isinstance(data, dict):
        return {"ok": False, "error": "ongeldige invoer"}, 400
    record = {
        "data": data,
        "ontvangen": datetime.datetime.now().isoformat(timespec="seconds"),
        "bron": request.headers.get("Referer", "direct"),
    }
    _save_intake(record)
    _email_intake(data)
    return {"ok": True}


@app.route("/bedankt")
def bedankt():
    return render_template("bedankt.html", page=_page(
        "Aanvraag ontvangen | BEBO Betonboren & Zagen", "Je offerteaanvraag is ontvangen.", nav=None))


@app.errorhandler(404)
def not_found(_e):
    return render_template("404.html", page=_page(
        "Pagina niet gevonden | BEBO Betonboren & Zagen", "Deze pagina bestaat niet.", nav=None)), 404


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
