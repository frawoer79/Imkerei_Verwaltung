# Imkereiverwaltung – Webanwendung

Next.js-Anwendung (TypeScript, App Router) mit PostgreSQL-Datenbank über Prisma.

## Lokal einrichten

Voraussetzung: Node.js und eine erreichbare PostgreSQL-Datenbank.

1. Abhängigkeiten installieren:

   ```bash
   npm install
   ```

2. `.env` anlegen (Vorlage: `.env.example`) und `DATABASE_URL` auf die eigene
   Postgres-Datenbank anpassen.

3. Datenbank-Schema anwenden:

   ```bash
   npx prisma migrate dev
   ```

4. Entwicklungsserver starten:

   ```bash
   npm run dev
   ```

   Die Anwendung läuft dann unter <http://localhost:3000>.

## Nach einer Änderung am Datenmodell

Änderungen an `prisma/schema.prisma` werden per Migration in die Datenbank
übernommen:

```bash
npx prisma migrate dev --name kurze-beschreibung-der-aenderung
```

Das legt eine neue Datei unter `prisma/migrations/` an (wird mit committet)
und wendet sie auf die lokale Datenbank an. `npx prisma studio` öffnet eine
grafische Oberfläche zum Ansehen/Bearbeiten der Datenbank.

## Fotos / Uploads

Hochgeladene Fotos landen im Verzeichnis, das `UPLOAD_DIR` in `.env` angibt
(Standard: `./uploads`, lokal nicht Teil des Git-Repositorys). Ausgeliefert
werden sie über die Route `/bilder/[dateiname]`, die vorher in der Datenbank
prüft, ob das Bild tatsächlich existiert. In Produktion muss `UPLOAD_DIR` auf
ein dauerhaftes Volume zeigen, sonst gehen Fotos bei jedem Deployment
verloren.

## Behandlungsdokumentation

Angewendete Tierarzneimittel sind nach Art. 108 VO (EU) 2019/6 und § 2 THAMNV
nachzuweisen - auch freiverkäufliche wie Ameisensäure. Die App bildet das ab:

- `/einstellungen` - Name und Anschrift des Bienenhalters, erscheint im Kopf
  jedes Nachweises. Muss vor dem ersten Export ausgefüllt sein.
- `/medikamente` - je gekaufter Packung ein Eintrag mit Charge, Kaufdatum,
  Lieferant und angehängtem Erwerbsbeleg (Foto oder PDF).
- `/behandlungen` - eine Behandlung deckt beliebig viele Völker ab und wird
  nach dem Speichern nicht mehr bearbeitet, sondern nur noch storniert: die
  Aufzeichnungen müssen unveränderlich sein.
- **PDF-Nachweis** - unter `/behandlungen` erzeugt "PDF erstellen" die Datei
  serverseitig (`@react-pdf/renderer`, kein Chromium im Container nötig) für
  ein Jahr und wahlweise alle Stände, einen Stand oder ein einzelnes Volk.
  Die Datei liegt im `UPLOAD_DIR` und bleibt dort, bis sie ausdrücklich
  gelöscht wird; ausgeliefert wird sie über `/nachweise/[dateiname]`
  (mit `?download=1` als Download statt Anzeige).
- `/behandlungen/nachweis` - dieselben Daten als schnelle Vorschau am
  Bildschirm, ohne eine Datei zu erzeugen.

Die Fristen: Nachweise und Erwerbsbelege je fünf Jahre aufbewahren.

## Beutensysteme, Honigraum und Ernte

### Stammdaten (`/einstellungen/beuten`)

Drei Ebenen, in der Reihenfolge, in der man das im Kopf hat:

1. **Beutensystem** - Zander, Deutsch Normalmaß, Dadant Blatt, Dadant
   modifiziert (US), Langstroth, Kuntzsch. Aus dem Katalog gewählt, kommen
   die genormten Rähmchenmaße gleich mit (`web/src/lib/beutensysteme.ts`).
2. **Brutraum** - welches Maß, ein- oder zweiräumig. Das ist die
   Betriebsweise ("2 × Zander ganz"), am Volk auswählbar. Dasselbe Maß darf
   mehrfach vorkommen, damit ein- und zweiräumig nebeneinander stehen können.
3. **Honigraum** - dasselbe plus den Durchschnittsertrag einer vollen Zarge.
   In der Durchsicht aufsetzbar und später erntbar.

Jedes System ist zugeklappt und zeigt in der Kopfzeile, was festgelegt ist.
Die Rähmchenmaße dahinter (Breite x Höhe, Eignung, kg je voller Wabe) stehen
noch eine Ebene tiefer - die fasst man nach dem Anlegen selten wieder an. Die
Eignung (`BRUTRAUM`, `HONIGRAUM`, `BEIDES`) kürzt die Auswahllisten: ein
Halbrahmen wird nicht als Brutraum vorgeschlagen, eine Flachzarge dagegen
schon (Flachzargenbetrieb).

Bei einem System, das vor dem Katalog angelegt wurde oder dem Maße fehlen,
ergänzt ein Knopf unter "Rähmchenmaße" die fehlenden aus dem Katalog.

Die kg-Angaben im Katalog sind aus der Wabenfläche abgeleitete Richtwerte,
keine gemessenen Zahlen - sie sind zum Anpassen gedacht.

### Honigraum in der Durchsicht

**Aufsetzen:** welche Zarge, wie viele, und wie die Waben beschaffen waren
(ausgebaut, nur Mittelwände, gemischt). Je Zarge entsteht eine eigene Zeile in
`Honigraumaufsatz`, damit sie später einzeln abgenommen werden kann.

**Ernten:** die Honigräume, die auf dem Volk sitzen, stehen zum Abhaken bereit
- kein Neueintippen. Wer das Aufsetzen nicht dokumentiert hat, erfasst Zargen
und einzelne Waben weiterhin frei über "+ Zargen" / "+ Einzelne Waben".

Die Kilogramm rechnet die App aus den Durchschnittswerten. War die Ernte
magerer oder besser, korrigiert ein Schieberegler (40-160 %). Gespeichert
werden beide Werte: `honigSchaetzungKg` (was die Durchschnittswerte ergaben)
und `honigertragKg` (was gilt). Über die Zeit zeigt der Vergleich, ob die
Durchschnittswerte stimmen.

Bezeichnung und Gewicht je Einheit stehen in `HonigernteAnteil` und
`Honigraumaufsatz` als **Kopie** - ändert man später die Durchschnittswerte
oder löscht eine Zarge, verschieben sich alte Erntemengen dadurch nicht.

Der Server leitet Gewichte und Schätzung selbst aus den Stammdaten ab; das
Formular schickt nur, WAS bewegt wurde, plus den Korrekturfaktor.

## Maßnahmen im Kalender

Offene Maßnahmen mit Termin gibt es unter `/kalender/<kennung>.ics` als
Kalender zum Abonnieren (iCalendar-Format, erzeugt in `web/src/lib/kalender.ts`).
Die Kennung steht am Betrieb in der Datenbank und lässt sich in den
Einstellungen neu erzeugen, falls die Adresse einmal in falsche Hände gerät.

Zwei Dinge, die beim Einrichten leicht übersehen werden:

- Der Passwortschutz der Seite liegt auch vor dem Kalender. Beim Abonnieren
  müssen deshalb Benutzername und Passwort der Seite angegeben werden -
  Kalender-Apps können das (iOS: Kalenderabo hinzufügen).
- iOS wirft mitgelieferte Erinnerungen standardmäßig weg. Beim Abonnieren den
  Schalter "Alarme entfernen" ausschalten, sonst kommt kein Weckruf.

In den Einstellungen lassen sich Erinnerungszeitpunkt, Farbe und Titelmuster
der Termine wählen (Platzhalter `{massnahme}`, `{volk}`, `{stand}`). Leer
gelassen gilt jeweils die Vorgabe aus `web/src/lib/kalender.ts`. Die Farbe
wird als `COLOR` und `X-APPLE-CALENDAR-COLOR` mitgeschickt - Apple richtet
sich bei abonnierten Kalendern allerdings meist nach der Farbe, die in der
Kalender-App für das Abo eingestellt ist.

## Tech-Stack

- **Next.js** (App Router, Server Actions) + **TypeScript**
- **PostgreSQL** + **Prisma** als ORM/Migrationswerkzeug
- **Tailwind CSS** fürs Styling

## Deployment

Betrieb als Docker-Container über Coolify (siehe `Projektstand.md` im
Hauptverzeichnis für den Gesamtüberblick). Das `Dockerfile` baut die App in
drei Stufen und startet beim Containerstart automatisch
`prisma migrate deploy` (wendet offene Datenbank-Änderungen an), bevor der
Server hochfährt - siehe `docker-entrypoint.sh`.

In Coolify werden benötigt:

- Eine **PostgreSQL-Datenbank** (Coolify kann das als eigenen Dienst
  anlegen) und ihre Verbindungsadresse als Umgebungsvariable `DATABASE_URL`
  bei der App.
- Ein **dauerhaftes Volume**, das auf `/app/uploads` im Container gemountet
  ist - sonst gehen hochgeladene Fotos bei jedem neuen Deployment verloren.
  Dazu die Umgebungsvariable `UPLOAD_DIR=/app/uploads` setzen.
- Eine eigene **Domain**, zugewiesen an diese App (Coolify richtet
  automatisch ein gültiges HTTPS-Zertifikat ein).
- Drei Umgebungsvariablen für die Anmeldung (siehe nächster Abschnitt):
  `ANMELDUNG_BENUTZERNAME`, `ANMELDUNG_PASSWORT`, `ANMELDUNG_GEHEIMNIS`.

Der Container hört intern auf Port 3000 (`EXPOSE 3000` im Dockerfile).

## Passwortschutz (eigene Anmeldung)

Ohne weitere Maßnahmen wäre die App für jeden im Internet erreichbar, der
die Adresse kennt. Der Schutz läuft über eine eigene Login-Seite (`/login`,
siehe `web/src/proxy.ts` und `web/src/lib/anmeldung.ts`): ohne gültige
Sitzung leitet jede Seite dorthin um, nach erfolgreicher Anmeldung merkt ein
signiertes Cookie das für 30 Tage.

**Nicht** mehr über Coolifys HTTP Basic Authentication gelöst (früher der
Fall, siehe `Projektstand.md`): Safaris eingebaute Passwortabfrage hat auf
iOS praktisch keine Anbindung an Face ID/Schlüsselbund und baut sich träge
auf - ein normales Formular bekommt beides.

Benötigte Umgebungsvariablen (siehe `.env.example`):

- `ANMELDUNG_BENUTZERNAME` / `ANMELDUNG_PASSWORT` - die Zugangsdaten selbst.
- `ANMELDUNG_GEHEIMNIS` - signiert das Sitzungs-Cookie, damit es sich nicht
  einfach verlängern lässt. Zufälligen Wert erzeugen, z.B.
  `openssl rand -hex 32`, nicht selbst ausdenken.

Die App-Symbol-/Manifest-Dateien (`/icon.png`, `/apple-icon.png`,
`/manifest.webmanifest`, `/icons/*`) bleiben bewusst ohne Anmeldung
erreichbar - sonst lädt Safari beim "Zum Home-Bildschirm" kein Symbol.

### Sicherheit im Detail

- **Übertragung:** ausschließlich über HTTPS (Coolify/Let's Encrypt).
- **Passwort-Vergleich:** zeitkonstant (`timingSafeEqual` in
  `web/src/lib/anmeldung.ts`), damit die Antwortzeit keine Rückschlüsse auf
  einzelne Zeichen erlaubt.
- **Sitzungs-Cookie:** `httpOnly` (für Seiten-JavaScript nicht lesbar,
  schützt vor eingeschleustem Schadcode), `Secure` (nur über HTTPS) und
  signiert mit `ANMELDUNG_GEHEIMNIS` - ohne dieses Geheimnis lässt sich kein
  gültiges Cookie fälschen. Gültig 30 Tage.
- **Sperre nach Fehlversuchen:** schützt gegen automatisiertes
  Durchprobieren (Bots). Nach 5 falschen Anmeldeversuchen ist der
  betroffene Benutzername für 5 Minuten komplett gesperrt - unabhängig
  davon, ob danach die richtigen Zugangsdaten kommen. Seit es Testzugänge
  gibt je Benutzername getrennt, damit ein Tester, der sich vertippt, nicht
  Frank aussperrt. Der Zähler verfällt nach 15 Minuten Ruhe von selbst,
  ein erfolgreicher Login setzt ihn sofort zurück. Der Zustand lebt nur im
  Arbeitsspeicher des Servers (kein Datenbank-Eintrag) und wird bei jedem
  Neustart/Deployment zurückgesetzt - für diesen Zweck unbedenklich.
- **Was fehlt bewusst:** kein Passwort-Hashing (liegt als Klartext in der
  Umgebungsvariable - die liegt serverseitig bei Coolify, nie im
  Git-Repository oder Browser), keine Mehr-Faktor-Anmeldung. Für eine
  Einzelperson-Anwendung angemessen; bei mehreren Nutzern mit
  unterschiedlichen Rollen (siehe `Projektstand.md`) müsste das überarbeitet
  werden. Die Passwörter der Testzugänge liegen dagegen in der Datenbank
  und werden dort nur als Hash (scrypt mit Zufallswert) gespeichert.

## Testzugänge

Frank kann unter Einstellungen → Testzugänge bis zu fünf Tester per
persönlichem Link einladen (`/einladung/<geheime Kennung>`, ohne Anmeldung
erreichbar, nur einmal gültig). Beim ersten Besuch vergibt der Tester Name
und Passwort und bestätigt den Hinweis, dass es eine Testinstanz ohne
Garantie für seine Daten ist. Danach meldet er sich ganz normal unter
`/login` an.

**Trennung der Daten:** Jeder Tester bekommt in derselben Datenbank ein
eigenes PostgreSQL-Schema `tester_<id>` (ein eigener Namensraum mit allen
Tabellen der App) und einen eigenen Ordner `UPLOAD_DIR/tester/<id>` für
Fotos und Dokumente. Franks Daten bleiben unverändert im Schema `public`
und direkt in `UPLOAD_DIR`. `prisma` aus `web/src/lib/prisma.ts` wählt bei
jedem Aufruf anhand der Sitzung den passenden Datenbank-Client; ohne
gültige Sitzung gibt es einen Fehler statt Franks Daten. Der übrige Code
braucht dafür keine Änderung - mit einer Einschränkung:
`prisma.$transaction([...])` mit einer Liste geht nicht, stattdessen
`prisma.$transaction(async (tx) => ...)`.

**Migrationen:** Beim Containerstart läuft nach `prisma migrate deploy`
(Franks Schema) auch `scripts/tester-schemas-migrieren.mjs`, das dieselben
Migrationen auf alle Tester-Schemas anwendet. Ein Fehler dort hält Franks
App nicht auf.

**Wiederkommen und Passwort vergessen:** Der Einladungslink gilt nur einmal;
danach meldet sich der Tester unter `/login` an. Nach dem Einrichten zeigt
die Einladungsseite die Adresse der App. Vergisst er sein Passwort, setzt
Frank es in der Testerverwaltung zurück: das alte Passwort ist sofort
gesperrt, Name und Daten bleiben, und ein neuer einmaliger Link erlaubt das
Neuvergeben.

**Entfernen:** löscht Schema und Upload-Ordner des Testers endgültig, der
Tester ist sofort abgemeldet (`web/src/proxy.ts` prüft bei Tester-Cookies,
ob es den Zugang noch gibt). Testerdaten sind nicht Teil irgendeiner
eigenen Sicherung - für die Tester ist das ausdrücklich so angekündigt.

Voraussetzung in Coolify: Der Datenbank-Benutzer aus `DATABASE_URL` muss
neue Schemas anlegen dürfen (bei der von Coolify angelegten
Postgres-Datenbank ist das der Fall: im offiziellen Postgres-Image ist der
eingerichtete Benutzer Superuser).

### Passwort ändern

`ANMELDUNG_PASSWORT` in Coolify (Environment Variables) auf den neuen Wert
setzen, dann **Redeploy**. Wirkt sofort für neue Anmeldungen.

**Wichtig:** Bereits angemeldete Geräte bleiben mit ihrem bestehenden
Sitzungs-Cookie bis zu 30 Tage weiter angemeldet - das Ändern des Passworts
wirft sie nicht automatisch raus (das Cookie enthält kein Passwort, das
überprüft werden könnte). Um wirklich alle bestehenden Sitzungen sofort zu
beenden (z.B. nach einem verlorenen Gerät), zusätzlich `ANMELDUNG_GEHEIMNIS`
auf einen neuen Zufallswert setzen - das macht alle vorhandenen Cookies auf
einen Schlag ungültig.

### Passwort vergessen

Kein "Passwort vergessen"-Ablauf mit E-Mail nötig, da der Wert direkt in
Coolify unter Environment Variables einsehbar ist (`ANMELDUNG_PASSWORT`,
per Augen-Symbol einblendbar) oder dort einfach neu gesetzt werden kann.
