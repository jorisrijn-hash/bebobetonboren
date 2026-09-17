"""
BEBO Betonboren & Zagen - centrale inhoud
------------------------------------------
Eén bron voor alle teksten en gegevens op de site. Templates lezen alleen
hieruit, dus een nieuw telefoonnummer, een echte projectfoto of een review
hoeft maar op één plek te worden aangepast.

BRONNEN
- COMPANY, SERVICES, WORK_AREAS, WHY, EXPERIENCE, HERO_INTRO:
  bevestigd door de klant (content-intake 16-09-2026). Alleen spelling en
  interpunctie zijn gelijkgetrokken. NIET aanvullen met eigen claims.
- PROJECTS, CASES, CLIENT_LOGOS, REVIEWS:
  nog NIET aangeleverd. Velden die None zijn, renderen als nette placeholder
  ("Wordt aangeleverd"). Vul ze pas in met echte, gecontroleerde gegevens.
"""

import re

# ---------------------------------------------------------------------------
# Bedrijf & contact (bevestigd)
# ---------------------------------------------------------------------------

def _digits(value: str) -> str:
    return re.sub(r"\D", "", value)


def nl_phone_to_tel(number: str) -> str:
    """010-3220232 -> 0103220232 (voor tel:-links)."""
    return _digits(number)


def nl_phone_to_whatsapp(number: str) -> str:
    """010-3220232 -> 31103220232 (wa.me verwacht landcode zonder + en zonder 0)."""
    digits = _digits(number)
    if digits.startswith("0031"):
        return digits[2:]
    if digits.startswith("31"):
        return digits
    if digits.startswith("0"):
        return "31" + digits[1:]
    return digits


def nl_phone_to_international(number: str) -> str:
    """010-3220232 -> +31 10 322 0232 (voor structured data)."""
    digits = nl_phone_to_whatsapp(number)  # 31103220232
    return "+{} {} {} {}".format(digits[:2], digits[2:4], digits[4:7], digits[7:])


_PHONE = "010-3220232"

COMPANY = {
    "name": "BEBO Betonboren & Zagen",
    "short": "BEBO",
    "subtitle": "Betonboren & Zagen",
    "phone": _PHONE,
    "phone_tel": nl_phone_to_tel(_PHONE),
    "phone_intl": nl_phone_to_international(_PHONE),
    "whatsapp": nl_phone_to_whatsapp(_PHONE),  # zelfde nummer als telefoon
    "email": "info@bebobetonboren.nl",
    "street": "Industrieweg 69-156",
    "postal_code": "2651 BC",
    "city": "Berkel en Rodenrijs",
    "country": "NL",
    "kvk": "59493038",
    "maps_url": "https://www.google.com/maps/search/?api=1&query="
    "Industrieweg+69-156%2C+2651+BC+Berkel+en+Rodenrijs",
}
COMPANY["whatsapp_url"] = "https://wa.me/{}".format(COMPANY["whatsapp"])

# Klant-voorkeur voor de introtekst (letterlijk uit de intake).
HERO_INTRO = (
    "Boren, zagen, frezen en gericht slopen in beton en steen. "
    "Schoon werk, een strak resultaat en een ploeg die nakomt wat is afgesproken."
)

# ---------------------------------------------------------------------------
# Werkzaamheden (bevestigd - zes categorieën, namen en specs niet wijzigen)
# ---------------------------------------------------------------------------
# spec_key is alleen een label voor de metadata; de waarde (spec) is letterlijk.
# media: placeholder-specificatie tot er echte foto's zijn. Zet "src" zodra een
# foto is aangeleverd, bijv. "img/werk/bebo-betonboren-sparing.jpg".
SERVICES = [
    {
        "id": "betonboren",
        "index": "01",
        "title": "Betonboren",
        "spec_key": "Diameter",
        "spec": "Ø 12–900 mm",
        "text": "Diamantboren voor sparingen, leidingen, ventilatie en kernen. "
        "Schoon, recht en exact op maat – ook stofvrij waar geen water mag.",
        "media": {"src": None, "alt": "", "ratio": "16:10", "position": "50% 50%"},
    },
    {
        "id": "wandzagen",
        "index": "02",
        "title": "Wandzagen",
        "spec_key": "Zaagdiepte",
        "spec": "tot 60 cm diep",
        "text": "Strakke deur- en raamsparingen en complete doorbraken in wanden "
        "van beton en steen, met nette kanten en minimale overlast.",
        "media": {"src": None, "alt": "", "ratio": "3:2", "position": "50% 50%"},
    },
    {
        "id": "vloerzagen",
        "index": "03",
        "title": "Vloerzagen",
        "spec_key": "Toepassing",
        "spec": "trapgaten · sleuven",
        "text": "Trapgaten, leidingsleuven, kruipluiken, dilatatievoegen en "
        "liftsparingen – recht ingezaagd en zonder scheurwerk.",
        "media": {"src": None, "alt": "", "ratio": "3:2", "position": "50% 50%"},
    },
    {
        "id": "sleuven-frezen",
        "index": "04",
        "title": "Sleuven & frezen",
        "spec_key": "Uitvoering",
        "spec": "droog of nat",
        "text": "Frezen en sleuven zagen voor leidingen en kabels in ruwbouw, "
        "nieuwbouw of bewoonde situaties – netjes en stofbeperkt.",
        "media": {"src": None, "alt": "", "ratio": "21:9", "position": "50% 50%"},
    },
    {
        "id": "precisiesloop",
        "index": "05",
        "title": "Precisiesloop",
        "spec_key": "Afvoer",
        "spec": "incl. puinafvoer",
        "text": "Gericht verwijderen van vloeren, wanden en tegelwerk. We zagen "
        "het werk los, breken het uit en voeren het puin af.",
        "media": {"src": None, "alt": "", "ratio": "4:3", "position": "50% 50%"},
    },
    {
        "id": "ankers-verlijmen",
        "index": "06",
        "title": "Ankers & verlijmen",
        "spec_key": "Systeem",
        "spec": "Hilti HIT-systeem",
        "text": "Chemisch verankeren van stekken en ankers met hoogwaardige "
        "Hilti-producten voor een sterke, duurzame hechting.",
        "media": {"src": None, "alt": "", "ratio": "4:3", "position": "50% 50%"},
    },
]
SERVICE_BY_ID = {s["id"]: s for s in SERVICES}

# Extra keuze in het offerteformulier (geen dienst op de site).
FORM_OTHER = {"id": "anders", "title": "Anders / weet ik niet"}

# ---------------------------------------------------------------------------
# Werkgebied (bevestigd). lat/lon = openbare plaatscoördinaten, alleen gebruikt
# voor het schematische kaartje. Geen afstanden of reistijden claimen.
# label: plaats van het naamlabel t.o.v. de stip (left/right/top/bottom/bottom-left).
# ---------------------------------------------------------------------------
WORK_AREAS = [
    {"name": "Berkel en Rodenrijs", "base": True, "lat": 51.9930, "lon": 4.4750, "label": "bottom-left"},
    {"name": "Rotterdam", "lat": 51.9244, "lon": 4.4777, "label": "right"},
    {"name": "Lansingerland", "lat": 52.0050, "lon": 4.5250, "label": "bottom"},
    {"name": "Pijnacker", "lat": 52.0195, "lon": 4.4290, "label": "top"},
    {"name": "Delft", "lat": 52.0116, "lon": 4.3571, "label": "left"},
    {"name": "Den Haag", "lat": 52.0705, "lon": 4.3007, "label": "left"},
    {"name": "Zoetermeer", "lat": 52.0607, "lon": 4.4940, "label": "right"},
]

# ---------------------------------------------------------------------------
# Waarom BEBO (bevestigd) + ervaring
# ---------------------------------------------------------------------------
WHY = [
    {
        "index": "01",
        "title": "Schoon en stofbeperkt",
        "text": "We werken met water- en stofafzuiging, ook in bewoonde situaties.",
    },
    {
        "index": "02",
        "title": "Recht en op maat",
        "text": "Tot op de millimeter, zonder scheurwerk of nabewerking.",
    },
    {
        "index": "03",
        "title": "Ploeg die nakomt",
        "text": "Afspraak is afspraak: op tijd, netjes en opgeruimd achtergelaten.",
    },
]

# LET OP: dit is ervaring in de bouwsector, NIET de leeftijd van het bedrijf.
EXPERIENCE = {"value": "25+", "label": "jaar ervaring in de bouwsector"}

# ---------------------------------------------------------------------------
# Werkwijze - neutrale beschrijving van het proces, zonder reactietijden of
# garanties (die zijn niet bevestigd).
# ---------------------------------------------------------------------------
PROCESS = [
    {
        "index": "01",
        "title": "Aanvraag",
        "text": "Je stuurt je aanvraag via het formulier, telefonisch of via WhatsApp. "
        "Foto's van de situatie helpen bij de inschatting.",
    },
    {
        "index": "02",
        "title": "Inschatting",
        "text": "We bekijken wat er moet gebeuren en nemen contact met je op "
        "over de aanpak en de kosten.",
    },
    {
        "index": "03",
        "title": "Afspraak",
        "text": "We leggen samen de werkzaamheden en het moment van uitvoering vast.",
    },
    {
        "index": "04",
        "title": "Uitvoering",
        "text": "We voeren het werk op locatie uit zoals afgesproken.",
    },
]

# ---------------------------------------------------------------------------
# ONS WERK - geselecteerde projectbeelden
# ---------------------------------------------------------------------------
# CLIENT ASSET REQUIRED
# Content: echte BEBO-projectfoto's (geen stockbeelden).
# Zet per item "src" (pad binnen static/), "alt" (beschrijf wat zichtbaar is)
# en vul alleen metadata in die de klant heeft bevestigd. None = placeholder.
# layout: "lead" (groot liggend), "side" (klein), "wide" (breed).
# De ratio's zijn afgestemd op het mozaïek (8/4 kolommen); wijzig ze samen.
# position: object-position, zodat machines/sparingen niet wegvallen bij crop.
PROJECTS = [
    {
        "id": "001", "layout": "lead", "ratio": "16:10", "min_width": 1800,
        "orientation": "liggend",
        "src": None, "alt": "", "position": "50% 50%",
        "type": None, "location": None, "detail": None,
    },
    {
        "id": "002", "layout": "side", "ratio": "4:5", "min_width": 1200,
        "orientation": "staand",
        "src": None, "alt": "", "position": "50% 50%",
        "type": None, "location": None, "detail": None,
    },
    {
        "id": "003", "layout": "side", "ratio": "1:1", "min_width": 1200,
        "orientation": "vierkant",
        "src": None, "alt": "", "position": "50% 50%",
        "type": None, "location": None, "detail": None,
    },
    {
        "id": "004", "layout": "wide", "ratio": "2:1", "min_width": 2000,
        "orientation": "breed liggend",
        "src": None, "alt": "", "position": "50% 50%",
        "type": None, "location": None, "detail": None,
    },
]

# ---------------------------------------------------------------------------
# PROJECTCASES - uitgelichte projecten (2-3 zodra aangeleverd)
# ---------------------------------------------------------------------------
# Structuur per case. Alles None = placeholder. NIETS verzinnen.
CASE_TEMPLATE = {
    "id": "01",
    "title": None,          # bijv. "Sparingen voor ventilatie in kantoorpand"
    "location": None,       # plaats
    "service": None,        # één van de SERVICES-titels
    "dimensions": None,     # bijv. "Ø 250 mm, 14 stuks"
    "material": None,       # bijv. "gewapend beton, 30 cm"
    "situation": None,      # bijv. "bewoond pand"
    "description": None,    # korte projectomschrijving
    "image": None,          # {"src": ..., "alt": ..., "position": ...}
    "detail_image": None,
    "before_image": None,   # optioneel
    "after_image": None,    # optioneel
    "technical": [],        # optioneel: [{"label": "Boordiepte", "value": "..."}]
}
CASES = []  # Vul met echte cases op basis van CASE_TEMPLATE.

# ---------------------------------------------------------------------------
# Vertrouwen - opdrachtgevers & reviews (nog niets bevestigd)
# ---------------------------------------------------------------------------
# CLIENT_LOGOS = [{"name": "Bedrijfsnaam", "src": "img/klanten/naam.svg"}]
CLIENT_LOGOS = []
# REVIEWS = [{"text": "...", "name": "...", "role": "...", "source": "Google"}]
REVIEWS = []
# REVIEW_RATING = {"score": "4,8", "count": 12, "source": "Google"}  # alleen echt
REVIEW_RATING = None

# Aantal placeholder-slots dat getoond wordt in preview-modus.
PLACEHOLDER_LOGO_SLOTS = 5
PLACEHOLDER_REVIEW_SLOTS = 2
