"""
BEBO Betonboren & Zagen - Flask website
----------------------------------------
Een moderne, lead-genererende site met een offerte-aanvraag als kern.

Belangrijk voor deployment (Railway):
- Start command: `gunicorn app:app`  (staat ook in Procfile)
- De PORT wordt door Railway via de omgevingsvariabele PORT aangeleverd.
- Leads worden weggeschreven naar data/leads.jsonl. Wil je e-mailnotificaties?
  Zet dan de SMTP_* env vars (zie .env.example). Zonder die vars werkt de site
  gewoon door en worden leads alleen lokaal opgeslagen.
"""

import os
import json
import smtplib
import datetime
from email.message import EmailMessage
from pathlib import Path

from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    flash,
)

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "verander-mij-in-productie")

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
LEADS_FILE = DATA_DIR / "leads.jsonl"

# Diensten die als chips in het offerteformulier verschijnen en die
# de servicekaarten voeden. Eén bron, zodat alles consistent blijft.
DIENSTEN = [
    {
        "id": "betonboren",
        "index": "01",
        "titel": "Betonboren",
        "spec": "Ø 12-500 mm",
        "tekst": "Diamantboren voor sparingen, leidingen, ventilatie en kernen. "
        "Schoon, recht en exact op maat - ook stofvrij waar geen water mag.",
    },
    {
        "id": "wandzagen",
        "index": "02",
        "titel": "Wandzagen",
        "spec": "tot 60 cm diep",
        "tekst": "Strakke deur- en raamsparingen en complete doorbraken in wanden "
        "van beton en steen, met nette kanten en minimale overlast.",
    },
    {
        "id": "vloerzagen",
        "index": "03",
        "titel": "Vloerzagen",
        "spec": "trapgaten · sleuven",
        "tekst": "Trapgaten, leidingsleuven, kruipluiken, dilatatievoegen en "
        "liftsparingen - recht ingezaagd en zonder scheurwerk.",
    },
    {
        "id": "sleuven-frezen",
        "index": "04",
        "titel": "Sleuven & frezen",
        "spec": "droog of nat",
        "tekst": "Frezen en sleuven zagen voor leidingen en kabels in ruwbouw, "
        "nieuwbouw of bewoonde situatie - netjes en stofbeperkt.",
    },
    {
        "id": "sloopwerk",
        "index": "05",
        "titel": "Precisiesloop",
        "spec": "incl. puinafvoer",
        "tekst": "Gericht verwijderen van vloeren, wanden en tegelwerk. We zagen "
        "het werk los, breken het uit en voeren het puin af.",
    },
    {
        "id": "ankers",
        "index": "06",
        "titel": "Ankers & verlijmen",
        "spec": "Hilti HIT-systeem",
        "tekst": "Chemisch verankeren van stekken en ankers met hoogwaardige "
        "Hilti-producten voor een sterke, duurzame hechting.",
    },
]
DIENST_IDS = {d["id"] for d in DIENSTEN}
DIENST_LABELS = {d["id"]: d["titel"] for d in DIENSTEN}

BEDRIJF = {
    "naam": "BEBO Betonboren & Zagen",
    "straat": "Industrieweg 69-156",
    "postcode_plaats": "2651 BC Berkel en Rodenrijs",
    "email": "info@bebobetonboren.nl",
    "tel": "010-3220232",
    "tel_link": "+31103220232",
    "whatsapp": "31103220232",
    "kvk": "59493038",
}


def _save_lead(lead: dict) -> None:
    """Schrijf de lead regel-voor-regel weg (append-only, crash-bestendig)."""
    with LEADS_FILE.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(lead, ensure_ascii=False) + "\n")


def _maybe_email(lead: dict) -> None:
    """Stuur optioneel een notificatiemail. Faalt nooit hard."""
    host = os.environ.get("SMTP_HOST")
    if not host:
        return
    try:
        msg = EmailMessage()
        diensten = ", ".join(DIENST_LABELS.get(d, d) for d in lead["diensten"]) or "-"
        msg["Subject"] = f"Nieuwe offerteaanvraag - {lead['naam']}"
        msg["From"] = os.environ.get("SMTP_FROM", os.environ["SMTP_USER"])
        msg["To"] = os.environ.get("MAIL_TO", BEDRIJF["email"])
        msg.set_content(
            f"Nieuwe aanvraag via de website\n\n"
            f"Naam:       {lead['naam']}\n"
            f"Telefoon:   {lead['telefoon']}\n"
            f"E-mail:     {lead['email']}\n"
            f"Plaats:     {lead['plaats']}\n"
            f"Werk:       {diensten}\n"
            f"Planning:   {lead['planning']}\n\n"
            f"Omschrijving:\n{lead['omschrijving']}\n\n"
            f"Ontvangen:  {lead['ontvangen']}\n"
        )
        with smtplib.SMTP(host, int(os.environ.get("SMTP_PORT", 587))) as s:
            s.starttls()
            s.login(os.environ["SMTP_USER"], os.environ["SMTP_PASS"])
            s.send_message(msg)
    except Exception as exc:  # noqa: BLE001 - notificatie mag de lead nooit blokkeren
        app.logger.warning("E-mailnotificatie mislukt: %s", exc)


@app.route("/")
def index():
    return render_template("index.html", diensten=DIENSTEN, bedrijf=BEDRIJF)


@app.route("/offerte", methods=["POST"])
def offerte():
    # Honeypot: bots vullen dit verborgen veld in, mensen niet.
    if request.form.get("website"):
        return redirect(url_for("bedankt"))

    naam = request.form.get("naam", "").strip()
    telefoon = request.form.get("telefoon", "").strip()
    email = request.form.get("email", "").strip()
    plaats = request.form.get("plaats", "").strip()
    omschrijving = request.form.get("omschrijving", "").strip()
    planning = request.form.get("planning", "").strip() or "Niet opgegeven"
    diensten = [d for d in request.form.getlist("diensten") if d in DIENST_IDS]

    fouten = []
    if len(naam) < 2:
        fouten.append("naam")
    if not telefoon and not email:
        fouten.append("contact")

    if fouten:
        flash("Vul minimaal je naam en een telefoonnummer of e-mailadres in.", "error")
        return redirect(url_for("index") + "#offerte")

    lead = {
        "naam": naam,
        "telefoon": telefoon,
        "email": email,
        "plaats": plaats,
        "diensten": diensten,
        "omschrijving": omschrijving,
        "planning": planning,
        "ontvangen": datetime.datetime.now().isoformat(timespec="seconds"),
        "bron": request.headers.get("Referer", "direct"),
    }
    _save_lead(lead)
    _maybe_email(lead)
    return redirect(url_for("bedankt"))


@app.route("/bedankt")
def bedankt():
    return render_template("bedankt.html", bedrijf=BEDRIJF)


@app.errorhandler(404)
def not_found(_e):
    return render_template("404.html", bedrijf=BEDRIJF), 404


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
