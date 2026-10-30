"""Baut die Anleitung aus vorlage.html und den Bildern in bilder/.

Aufruf aus dem Repository-Ordner:

    python3 anleitung/bauen.py [--einzeldatei PFAD] [--artifact PFAD]

Erzeugt immer:
  - web/src/app/anleitung/inhalt.ts   Text und Stil für den Menüpunkt "Anleitung" in der App
  - web/public/anleitung/bilder/*.webp die dort benutzten Bilder
  - ANLEITUNG.md                       dieselbe Anleitung zum Lesen direkt auf GitHub

Auf Wunsch zusätzlich:
  --einzeldatei  eine eigenständige HTML-Datei mit eingebetteten Bildern
                 (zum Weitergeben, öffnet ohne Netz)
  --artifact     dieselbe Datei ohne doctype/html/head/body, zum
                 Veröffentlichen als claude.ai-Artifact

In der Vorlage gelten zwei Markierungen:
  <!--nur-app-->...<!--/nur-app-->      nur in der App
  <!--nur-datei-->...<!--/nur-datei-->  nur in Einzeldatei und Artifact
Bilder stehen als <img data-bild="name"> darin (bilder/name.webp).
"""

import argparse
import html
from html.parser import HTMLParser
import base64
import json
import os
import re
import shutil

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
VORLAGE = os.path.join(HIER, "vorlage.html")
BILDER = os.path.join(HIER, "bilder")
APP_TS = os.path.join(REPO, "web", "src", "app", "anleitung", "inhalt.ts")
APP_BILDER = os.path.join(REPO, "web", "public", "anleitung", "bilder")
MARKDOWN = os.path.join(REPO, "ANLEITUNG.md")


def markierungen(text, behalten, entfernen):
    text = re.sub(rf"<!--{entfernen}-->.*?<!--/{entfernen}-->", "", text, flags=re.S)
    return re.sub(rf"<!--/?{behalten}-->", "", text)


def benutzte_bilder(text):
    return sorted(set(re.findall(r'data-bild="([^"]+)"', text)))


# --- CSS für die App: Selektoren unter .anleitung hängen ---------------------

def selektor_einhaengen(selektor):
    s = selektor.strip()
    for wurzel in (':root[data-theme="dark"]', ':root:not([data-theme="light"])'):
        if s.startswith(wurzel):
            rest = s[len(wurzel):].strip()
            return f"{wurzel} .anleitung" + (f" {rest}" if rest else "")
    if s in (":root", "html", "body"):
        return ".anleitung"
    if s == "*":
        return ".anleitung, .anleitung *"
    return f".anleitung {s}"


def css_einhaengen(css):
    aus = []
    i = 0
    while i < len(css):
        if css[i].isspace():
            aus.append(css[i])
            i += 1
            continue
        klammer = css.index("{", i)
        kopf = css[i:klammer].strip()
        if kopf.startswith("@media"):
            # Inhalt bis zur passenden schließenden Klammer
            tiefe, j = 1, klammer + 1
            while tiefe:
                tiefe += {"{": 1, "}": -1}.get(css[j], 0)
                j += 1
            aus.append(kopf + " {" + css_einhaengen(css[klammer + 1:j - 1]) + "}")
            i = j
            continue
        ende = css.index("}", klammer)
        koerper = css[klammer + 1:ende]
        selektoren = ", ".join(selektor_einhaengen(s) for s in kopf.split(","))
        aus.append(f"{selektoren} {{{koerper}}}")
        i = ende + 1
    return "".join(aus)


# In der App kommen Farben und Schrift von der App selbst, damit die Anleitung
# hell wie dunkel genauso aussieht wie die übrigen Seiten.
# Die Farbnamen der Vorlage (--card, --muted, ...) heißen teils genauso wie
# die der App; in der App bekommen sie deshalb den Vorsatz "anl-".
VORLAGE_FARBEN = ["bg", "card", "text", "muted", "border", "accent", "accent-soft", "on-accent",
                  "warn-bg", "warn-border", "warn-text", "tip-bg", "tip-border", "hero", "on-hero"]

APP_FARBEN = """
.anleitung {
  --anl-bg: var(--background); --anl-card: var(--card); --anl-text: var(--foreground); --anl-muted: var(--muted);
  --anl-border: var(--border); --anl-accent: var(--accent); --anl-on-accent: var(--accent-foreground);
  --anl-accent-soft: color-mix(in srgb, var(--accent) 12%, transparent);
  --anl-warn-bg: var(--warnung-flaeche); --anl-warn-border: var(--warnung-rand); --anl-warn-text: var(--warnung);
  --anl-tip-bg: var(--ok-flaeche); --anl-tip-border: var(--ok-rand);
  --anl-hero: var(--accent); --anl-on-hero: var(--accent-foreground);
}
"""

APP_ANPASSUNGEN = """
.anleitung { font: inherit; font-size: 16px; line-height: 1.6; background: transparent; }
.anleitung .layout { max-width: none; }
.anleitung nav.toc { padding: 4px 16px 24px 0; height: 100dvh; }
.anleitung nav.toc .marke { display: none; }
.anleitung .inhalt { padding: 0 0 40px 24px; }
@media (max-width: 1279px) {
  /* Schmaler: Inhaltsverzeichnis als Reihe kleiner Sprungmarken über dem Text. */
  .anleitung nav.toc { padding: 0 0 16px; height: auto; margin-bottom: 20px; }
  .anleitung nav.toc ol { columns: auto; display: flex; flex-wrap: wrap; gap: 6px; }
  .anleitung nav.toc li { margin: 0; }
  .anleitung nav.toc li a { border: 1px solid var(--rand-ruhig); padding: 4px 10px; font-size: 13.5px; border-radius: 999px; }
  .anleitung .inhalt { padding: 0; }
}
"""


def app_css(css):
    # Farbdefinitionen der Vorlage (hell, dunkel per System, dunkel per
    # Umschalter) entfallen, die übernimmt APP_FARBEN.
    css = re.sub(r":root \{[^}]*\}\s*", "", css, count=1)
    css = re.sub(r"@media \(prefers-color-scheme: dark\) \{ :root:not\(\[data-theme=\"light\"\]\) \{[^}]*\} \}\s*", "", css, count=1)
    css = re.sub(r":root\[data-theme=\"dark\"\] \{[^}]*\}\s*", "", css, count=1)
    # Am PC steht das App-Menü schon links, das Inhaltsverzeichnis rutscht
    # deshalb erst bei breiterem Fenster daneben.
    css = css.replace("@media (max-width: 900px)", "@media (max-width: 1279px)")
    css = css.replace("main {", ".inhalt {").replace("main{", ".inhalt{")
    css = re.sub(r"var\(--(" + "|".join(sorted(VORLAGE_FARBEN, key=len, reverse=True)) + r")\)", r"var(--anl-\1)", css)
    return APP_FARBEN + css_einhaengen(css) + APP_ANPASSUNGEN


def app_bauen(vorlage):
    text = markierungen(vorlage, "nur-app", "nur-datei")
    css = re.search(r"<style>(.*?)</style>", text, re.S).group(1)
    koerper = re.search(r"<body>(.*?)</body>", text, re.S).group(1).strip()
    koerper = koerper.replace('<main id="start">', '<div class="inhalt" id="start">').replace("</main>", "</div>")
    koerper = re.sub(r'data-bild="([^"]+)"', r'src="/anleitung/bilder/\1.webp" loading="lazy"', koerper)

    os.makedirs(os.path.dirname(APP_TS), exist_ok=True)
    with open(APP_TS, "w") as datei:
        datei.write(
            "// Erzeugt von anleitung/bauen.py aus anleitung/vorlage.html - nicht von Hand ändern.\n\n"
            f"export const ANLEITUNG_CSS = {json.dumps(app_css(css), ensure_ascii=False)};\n\n"
            f"export const ANLEITUNG_HTML = {json.dumps(koerper, ensure_ascii=False)};\n"
        )

    if os.path.isdir(APP_BILDER):
        shutil.rmtree(APP_BILDER)
    os.makedirs(APP_BILDER)
    for name in benutzte_bilder(text):
        shutil.copy(os.path.join(BILDER, name + ".webp"), APP_BILDER)
    print(f"App: {APP_TS} ({os.path.getsize(APP_TS) // 1024} KB), {len(benutzte_bilder(text))} Bilder")


def einzeldatei_bauen(vorlage, ziel, artifact):
    text = markierungen(vorlage, "nur-datei", "nur-app")

    def einbetten(treffer):
        with open(os.path.join(BILDER, treffer.group(1) + ".webp"), "rb") as bild:
            daten = base64.b64encode(bild.read()).decode()
        return f'src="data:image/webp;base64,{daten}" loading="lazy"'

    text = re.sub(r'data-bild="([^"]+)"', einbetten, text)
    if ziel:
        with open(ziel, "w") as datei:
            datei.write(text)
        print(f"Einzeldatei: {ziel} ({os.path.getsize(ziel) // 1024} KB)")
    if artifact:
        art = re.sub(r"^<!doctype html>\s*<html[^>]*>\s*<head>\s*(<meta[^>]*>\s*)*", "", text, flags=re.S)
        art = art.replace("</head>\n<body>\n", "").replace("</body>\n</html>\n", "")
        with open(artifact, "w") as datei:
            datei.write(art)
        print(f"Artifact: {artifact}")


# --- Markdown für GitHub -----------------------------------------------------
# GitHub zeigt HTML-Dateien nur als Quelltext, Markdown dagegen fertig mit
# Bildern. So können Interessierte die Anleitung lesen, bevor sie
# installieren. Kennt nur die Elemente, die in vorlage.html vorkommen.

BILDBREITE = {"handy": 260, "schmal": 420, "breit": 640}


class MarkdownBauer(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.aus = []          # fertige Blöcke
        self.zeile = []        # laufender Text
        self.listen = []       # ["ol", nummer] oder ["ul", 0]
        self.figur = None      # Klasse der aktuellen Abbildung
        self.bilder = []       # Bilder einer Reihe "nebeneinander"
        self.unterschriften = []
        self.in_reihe = False
        self.kasten = None     # "hinweis" / "tipp"
        self.tabelle = None
        self.zelle = None
        self.ueberspringen = 0
        self.link = []

    # Hilfen
    def text_fertig(self):
        text = re.sub(r"[ \t\n]+", " ", "".join(self.zeile)).strip()
        self.zeile = []
        return re.sub(r"\s*§ZEILE§\s*", "  \n", text)

    def block(self, text):
        if not text:
            return
        if self.kasten:
            text = "\n".join("> " + z for z in text.split("\n"))
        self.aus.append(text)

    def bilder_ausgeben(self):
        if not self.bilder:
            return
        self.block(" ".join(self.bilder))
        if self.unterschriften:
            self.block(" · ".join("*" + u.replace("*", "") + "*" for u in self.unterschriften))
        self.bilder, self.unterschriften = [], []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        klasse = a.get("class", "")
        if self.ueberspringen:
            if tag not in ("img", "br", "meta"):
                self.ueberspringen += 1
            return
        if tag in ("nav", "style", "svg") or (tag == "span" and klasse == "nr"):
            self.ueberspringen = 1
            return
        if tag in ("h1", "h2", "h3"):
            self.block(self.text_fertig())
            if a.get("id"):
                self.block(f'<a id="{a["id"]}"></a>')
        elif tag == "section" and a.get("id"):
            self.abschnitt = a["id"]
            self.block(f'<a id="{a["id"]}"></a>')
        elif tag == "p":
            self.block(self.text_fertig())
        elif tag == "div":
            if klasse in ("hinweis", "tipp"):
                self.block(self.text_fertig())
                self.kasten = klasse
            elif klasse == "nebeneinander":
                self.in_reihe = True
        elif tag in ("ol", "ul"):
            self.block(self.text_fertig())
            self.listen.append([tag, int(a.get("start", 1)) - 1])
        elif tag == "li":
            if self.zeile:
                self.listenpunkt_beenden()
            self.listen[-1][1] += 1
        elif tag in ("strong", "b"):
            self.zeile.append("**")
        elif tag == "em":
            self.zeile.append("*")
        elif tag == "code":
            self.zeile.append("`")
        elif tag == "span" and klasse == "knopf":
            self.zeile.append("**[")
            self.link.append("knopf")
        elif tag == "a":
            self.zeile.append("[")
            self.link.append(a.get("href", ""))
        elif tag == "figure":
            self.block(self.text_fertig())
            self.figur = klasse or "breit"
        elif tag == "img" and self.figur:
            breite = BILDBREITE.get(self.figur, 640)
            alt = html.escape(a.get("alt", ""), quote=True)
            self.bilder.append(f'<img src="anleitung/bilder/{a["data-bild"]}.webp" width="{breite}" alt="{alt}">')
        elif tag == "table":
            self.block(self.text_fertig())
            self.tabelle = []
        elif tag == "tr":
            self.tabelle.append([])
        elif tag in ("td", "th"):
            self.zeile = []

    def listenpunkt_beenden(self):
        art, nummer = self.listen[-1]
        marke = f"{nummer}." if art == "ol" else "-"
        einzug = "   " * (len(self.listen) - 1)
        text = self.text_fertig()
        if text:
            zeile = f"{einzug}{marke} {text}"
            if self.aus and self.aus[-1].startswith("§LISTE§"):
                self.aus[-1] += "\n" + zeile
            else:
                self.aus.append("§LISTE§" + zeile)

    def handle_endtag(self, tag):
        if self.ueberspringen:
            self.ueberspringen -= 1
            return
        if tag in ("h1", "h2", "h3"):
            self.block("#" * int(tag[1]) + " " + self.text_fertig())
        elif tag == "p":
            self.block(self.text_fertig())
        elif tag == "li":
            self.listenpunkt_beenden()
        elif tag in ("ol", "ul"):
            if self.zeile:
                self.listenpunkt_beenden()
            self.listen.pop()
            if self.aus and self.aus[-1].startswith("§LISTE§"):
                self.aus[-1] = self.aus[-1][len("§LISTE§"):]
                if self.kasten:
                    self.aus[-1] = "\n".join("> " + z for z in self.aus[-1].split("\n"))
        elif tag in ("strong", "b"):
            self.zeile.append("**")
            # Überschrift eines Hinweiskastens in eine eigene Zeile
            if self.kasten and "".join(self.zeile).strip().startswith("**") and "".join(self.zeile).count("**") == 2:
                self.zeile.append("§ZEILE§")
        elif tag == "em":
            self.zeile.append("*")
        elif tag == "code":
            self.zeile.append("`")
        elif tag == "span" and self.link and self.link[-1] == "knopf":
            self.link.pop()
            self.zeile.append("]**")
        elif tag == "a":
            ziel = self.link.pop() if self.link else ""
            self.zeile.append(f"]({ziel})")
        elif tag == "figcaption":
            self.unterschriften.append(self.text_fertig())
        elif tag == "figure":
            self.figur = None
            if not self.in_reihe:
                self.bilder_ausgeben()
        elif tag == "div":
            if self.in_reihe and self.bilder:
                self.in_reihe = False
                self.bilder_ausgeben()
            elif self.kasten:
                self.block(self.text_fertig())
                self.kasten = None
        elif tag in ("td", "th"):
            self.tabelle[-1].append(self.text_fertig().replace("|", "\\|"))
        elif tag == "table":
            kopf, *rest = self.tabelle
            zeilen = ["| " + " | ".join(kopf) + " |", "|" + "---|" * len(kopf)]
            zeilen += ["| " + " | ".join(z) + " |" for z in rest]
            self.block("\n".join(zeilen))
            self.tabelle = None

    def handle_data(self, daten):
        if not self.ueberspringen:
            self.zeile.append(daten)

    def ergebnis(self):
        self.block(self.text_fertig())
        text = "\n\n".join(self.aus)
        text = text.replace("** **", " ").replace("****", "")
        return text


def markdown_bauen(vorlage):
    # Weder die App- noch die Datei-Hinweise passen auf GitHub.
    text = markierungen(vorlage, "nur-datei", "nur-app")
    text = re.sub(r"<!--nur-datei-->.*?<!--/nur-datei-->", "", vorlage, flags=re.S)
    text = re.sub(r"<!--nur-app-->.*?<!--/nur-app-->", "", text, flags=re.S)
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    koerper = re.search(r"<body>(.*?)</body>", text, re.S).group(1)
    bauer = MarkdownBauer()
    bauer.feed(koerper)
    inhalt = bauer.ergebnis()
    # Rücksprung "nach oben" passt auf GitHub nicht
    inhalt = re.sub(r"\[↑ nach oben\]\(#start\)\n*", "", inhalt)
    with open(MARKDOWN, "w") as datei:
        datei.write("<!-- Erzeugt von anleitung/bauen.py aus anleitung/vorlage.html - nicht von Hand ändern. -->\n\n")
        datei.write(inhalt.strip() + "\n")
    print(f"Markdown: {MARKDOWN} ({os.path.getsize(MARKDOWN) // 1024} KB)")


if __name__ == "__main__":
    argumente = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    argumente.add_argument("--einzeldatei")
    argumente.add_argument("--artifact")
    a = argumente.parse_args()
    with open(VORLAGE) as datei:
        vorlage = datei.read()
    fehlend = [name for name in benutzte_bilder(vorlage) if not os.path.exists(os.path.join(BILDER, name + ".webp"))]
    if fehlend:
        raise SystemExit(f"Bilder fehlen: {', '.join(fehlend)}")
    app_bauen(vorlage)
    markdown_bauen(vorlage)
    if a.einzeldatei or a.artifact:
        einzeldatei_bauen(vorlage, a.einzeldatei, a.artifact)
