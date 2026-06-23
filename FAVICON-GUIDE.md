# Favicon toevoegen aan elke website (herbruikbaar)

Een favicon is het kleine icoon in het browsertabblad, de bookmark en op het
startscherm van een telefoon. Je hebt niet 1 bestand nodig maar een klein setje,
zodat het overal scherp is.

## 1. Welke bestanden je nodig hebt

Maak ze allemaal uit 1 vierkante bronafbeelding (minimaal 512x512, met
transparante of effen achtergrond):

- `favicon.svg`        -> scherp op moderne browsers (vector, schaalt oneindig)
- `favicon-32.png`     -> tabblad op de meeste schermen
- `favicon-16.png`     -> kleine weergaves
- `apple-touch-icon.png` (180x180) -> iOS "zet op beginscherm"
- `favicon.ico`        -> oudere browsers (bevat 16/32/48 in 1 bestand)

Optioneel voor "installeerbare" web-apps (PWA): `favicon-192.png` en
`favicon-512.png` plus een `manifest.webmanifest`.

## 2. De maten genereren

### Optie A: in code (Python, met Pillow) - reproduceerbaar
```python
from PIL import Image
src = Image.open("bron.png").convert("RGBA")   # vierkant, groot
for size, name in [(16,"favicon-16.png"),(32,"favicon-32.png"),
                   (180,"apple-touch-icon.png"),(192,"favicon-192.png"),
                   (512,"favicon-512.png")]:
    src.resize((size,size), Image.LANCZOS).save(name, optimize=True)
# multi-size .ico
src.resize((48,48), Image.LANCZOS).save("favicon.ico", sizes=[(16,16),(32,32),(48,48)])
```
Tip: is je logo een simpele vorm? Teken het dan rechtstreeks groot (bijv. 1024px)
en schaal naar beneden. Downschalen blijft scherp, opschalen wordt wazig.

### Optie B: online
realfavicongenerator.net of favicon.io: upload 1 afbeelding, download het zip
met alle maten. Sneller, maar minder controle.

## 3. Waar plaatsen
Zet de bestanden bij je andere statische bestanden, bijvoorbeeld `static/img/`.

## 4. De `<link>`-tags (in de `<head>` van elke pagina)
```html
<link rel="icon" type="image/svg+xml" href="/static/img/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/static/img/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/static/img/favicon-16.png">
<link rel="apple-touch-icon" href="/static/img/apple-touch-icon.png">
```
Volgorde maakt niet uit; de browser kiest zelf de beste maat.

## 5. De automatische `/favicon.ico`-aanvraag
Browsers vragen altijd ook `/favicon.ico` op de root op, los van je link-tags.
- Statische host (Vercel, Netlify, GitHub Pages): zet `favicon.ico` gewoon in de
  root van je `public`/output-map. Klaar.
- Flask: voeg een mini-route toe (Flask serveert de root niet automatisch):
  ```python
  from flask import send_from_directory
  @app.route("/favicon.ico")
  def favicon():
      return send_from_directory(app.static_folder + "/img", "favicon.ico",
                                 mimetype="image/vnd.microsoft.icon")
  ```

## 6. Belangrijk: cache
Browsers bewaren favicons agressief. Zie je je nieuwe icoon niet?
- Hard verversen: Cmd+Shift+R (Mac) / Ctrl+F5 (Windows).
- Of open in een incognitovenster.
- Of forceer een nieuwe versie door een query toe te voegen aan de link:
  `href="/static/img/favicon-32.png?v=2"` (verhoog het nummer bij elke wijziging).
Op een tabblad kan het soms even duren; in de bookmarks/op het tabblad na een
harde refresh zie je het meestal direct.

## Samengevat
1 vierkante bron -> genereer svg + 16/32 png + 180 apple-touch + .ico ->
in `static/img/` -> link-tags in de `<head>` -> root-`favicon.ico` regelen ->
hard verversen tegen cache.
