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
# Detailpagina's per dienst
# ---------------------------------------------------------------------------
# applications: letterlijk afgeleid uit de bevestigde omschrijving hierboven.
#   Geen nieuwe toepassingen of capaciteiten toevoegen zonder bevestiging.
# diagram: welke schematische tekening de pagina toont (alleen bevestigde maten).
# layout: compositievariant van de pagina-hero (a / b / c), zodat pagina's
#   niet gekloond aanvoelen.
SERVICE_DETAILS = {
    "betonboren": {
        "layout": "a",
        "diagram": "bore",
        "applications_label": "Voor",
        "applications": ["Sparingen", "Leidingen", "Ventilatie", "Kernen"],
        "facts": [("Methode", "Diamantboren"), ("Diameter", "Ø 12–900 mm"), ("Ook", "stofvrij waar geen water mag")],
        "related": ["wandzagen", "vloerzagen", "ankers-verlijmen"],
        "meta_description": "Betonboren Ø 12–900 mm: diamantboren voor sparingen, leidingen, ventilatie en kernen. BEBO Betonboren & Zagen uit Berkel en Rodenrijs.",
    },
    "wandzagen": {
        "layout": "b",
        "diagram": "wall",
        "applications_label": "Voor",
        "applications": ["Deursparingen", "Raamsparingen", "Complete doorbraken"],
        "facts": [("Zaagdiepte", "tot 60 cm diep"), ("Materiaal", "beton en steen"), ("Resultaat", "nette kanten, minimale overlast")],
        "related": ["vloerzagen", "precisiesloop", "betonboren"],
        "meta_description": "Wandzagen tot 60 cm diep: deur- en raamsparingen en complete doorbraken in wanden van beton en steen. BEBO Betonboren & Zagen.",
    },
    "vloerzagen": {
        "layout": "c",
        "diagram": "floor",
        "applications_label": "Voor",
        "applications": ["Trapgaten", "Leidingsleuven", "Kruipluiken", "Dilatatievoegen", "Liftsparingen"],
        "facts": [("Toepassing", "trapgaten · sleuven"), ("Resultaat", "recht ingezaagd, zonder scheurwerk")],
        "related": ["wandzagen", "sleuven-frezen", "precisiesloop"],
        "meta_description": "Vloerzagen voor trapgaten, leidingsleuven, kruipluiken, dilatatievoegen en liftsparingen. BEBO Betonboren & Zagen, Berkel en Rodenrijs.",
    },
    "sleuven-frezen": {
        "layout": "a",
        "diagram": "groove",
        "applications_label": "Voor",
        "applications": ["Leidingen", "Kabels"],
        "situations": ["Ruwbouw", "Nieuwbouw", "Bewoonde situaties"],
        "facts": [("Uitvoering", "droog of nat"), ("Resultaat", "netjes en stofbeperkt")],
        "related": ["vloerzagen", "betonboren", "wandzagen"],
        "meta_description": "Sleuven en frezen voor leidingen en kabels, droog of nat, in ruwbouw, nieuwbouw of bewoonde situaties. BEBO Betonboren & Zagen.",
    },
    "precisiesloop": {
        "layout": "b",
        "diagram": "demolition",
        "applications_label": "Verwijderen van",
        "applications": ["Vloeren", "Wanden", "Tegelwerk"],
        "steps": ["Loszagen", "Uitbreken", "Puin afvoeren"],
        "facts": [("Afvoer", "incl. puinafvoer")],
        "related": ["wandzagen", "vloerzagen", "sleuven-frezen"],
        "meta_description": "Precisiesloop van vloeren, wanden en tegelwerk: we zagen het werk los, breken het uit en voeren het puin af. BEBO Betonboren & Zagen.",
    },
    "ankers-verlijmen": {
        "layout": "c",
        "diagram": "anchor",
        "applications_label": "Chemisch verankeren van",
        "applications": ["Stekken", "Ankers"],
        "facts": [("Systeem", "Hilti HIT-systeem"), ("Doel", "sterke, duurzame hechting")],
        "related": ["betonboren", "wandzagen"],
        "meta_description": "Ankers en verlijmen: chemisch verankeren van stekken en ankers met het Hilti HIT-systeem. BEBO Betonboren & Zagen, Berkel en Rodenrijs.",
    },
}
for _s in SERVICES:
    _s.update(SERVICE_DETAILS[_s["id"]])
    # Extra media-slot voor de detailpagina (werk in uitvoering).
    _s.setdefault("detail_media", {"src": None, "alt": "", "ratio": "4:5", "position": "50% 50%"})

# ---------------------------------------------------------------------------
# Werkgebied (bevestigd): alleen deze plaatsen.
# Coördinaten: PDOK Locatieserver (Kadaster), woonplaats-centroïden;
# Lansingerland = gemeente-centroïde. Geen afstanden, reistijden of grenzen.
# ---------------------------------------------------------------------------
HQ = {
    "name": "BEBO / basis",
    "street": COMPANY["street"],
    "postal": "{} {}".format(COMPANY["postal_code"], COMPANY["city"]),
    "lat": 51.98169851,
    "lon": 4.45390567,
    "route_url": COMPANY["maps_url"],
}
WORK_AREAS = [
    {"name": "Berkel en Rodenrijs", "base": True, "lat": 52.00049043, "lon": 4.46903273},
    {"name": "Rotterdam", "lat": 51.92248806, "lon": 4.48653571},
    {"name": "Lansingerland", "lat": 52.00400827, "lon": 4.50610722},
    {"name": "Pijnacker", "lat": 52.01506166, "lon": 4.43644719},
    {"name": "Delft", "lat": 51.99845672, "lon": 4.36310563},
    {"name": "Den Haag", "lat": 52.07207291, "lon": 4.29300083},
    {"name": "Zoetermeer", "lat": 52.06091036, "lon": 4.48977382},
]


def _dms(value: float, pos: str, neg: str) -> str:
    hemi = pos if value >= 0 else neg
    value = abs(value)
    d = int(value)
    m = int((value - d) * 60)
    sec = (value - d - m / 60) * 3600
    return "{}°{:02d}′{:04.1f}″ {}".format(d, m, sec, hemi)


# Technische coördinaat van de vestiging (metadata in hero/kaart).
HQ["coords"] = "{} · {}".format(_dms(HQ["lat"], "N", "Z"), _dms(HQ["lon"], "O", "W"))

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
# layout: "lead" (70% beeld + info), "pair-wide"/"pair-narrow" (ongelijk paar),
# "full" (schermbreed panorama). Ratio's zijn afgestemd op elkaar; wijzig ze samen.
# service: id uit SERVICES; linkt het project naar die dienstpagina.
# position: object-position, zodat machines/sparingen niet wegvallen bij crop.
PROJECTS = [
    {
        "id": "001", "layout": "lead", "ratio": "16:9", "min_width": 2400,
        "orientation": "liggend",
        "src": None, "alt": "", "position": "50% 50%",
        "type": None, "location": None, "detail": None, "service": None,
    },
    {
        "id": "002", "layout": "pair-wide", "ratio": "16:10", "min_width": 1800,
        "orientation": "liggend",
        "src": None, "alt": "", "position": "50% 50%",
        "type": None, "location": None, "detail": None, "service": None,
    },
    {
        "id": "003", "layout": "pair-narrow", "ratio": "8:7", "min_width": 1400,
        "orientation": "liggend",
        "src": None, "alt": "", "position": "50% 50%",
        "type": None, "location": None, "detail": None, "service": None,
    },
    {
        "id": "004", "layout": "full", "ratio": "21:9", "min_width": 2800,
        "orientation": "panorama",
        "src": None, "alt": "", "position": "50% 50%",
        "type": None, "location": None, "detail": None, "service": None,
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
