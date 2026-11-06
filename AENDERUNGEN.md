# Änderungen

Was sich von Version zu Version ändert, in einfachen Worten. Daraus entsteht
beim Freigeben einer Version die Änderungsliste auf GitHub, und die App zeigt
sie unter "Was ist neu?" an (siehe `.github/workflows/release.yml`).

So sieht ein Abschnitt aus:

- Überschrift `## 1.4.0`, danach die Punkte als Liste.
- Ist es ein Sicherheitsupdate, steht das in der Überschrift:
  `## 1.4.1 (Sicherheitsupdate)`. Die App zeigt es dann rot an und bietet
  kein "Überspringen" an.
- Bei einer neuen Hauptversion (`## 2.0.0`) steht hier, was vorher zu tun ist.

Neue Abschnitte kommen oben hin.

## 1.1.1

- Der Hell-/Dunkel-Schalter zeigt beim ersten Öffnen den richtigen Zustand. Bisher stand er auf Hell, obwohl die Seite dem dunklen Handy folgte, und brauchte zwei Klicks.
- Suchmaschinen nehmen eine eigene Installation nicht mehr in ihren Index auf (`robots.txt`).
- Neuer Schalter `DEMO_MODUS` für eine öffentliche Demo-Instanz mit Fantasiedaten. Nur für eine eigene Instanz mit eigener Datenbank gedacht, nie bei echten Daten. Beschreibung in `web/.env.example`.

## 1.1.0

- Neue Seite Lager → Verkäufe: alles Verkaufte auf einen Blick, mit Erlös, Käufer, Suche und Jahresfilter.
- Beim Auslagern mit Grund "Verkauf" lassen sich Erlös und Käufer eintragen. Ohne Erlös schätzt die App nach der Preisliste.
- Verkaufte Völker, Ableger und Königinnen erscheinen ebenfalls in der Verkaufsliste. Schon verkaufte Völker und Königinnen werden beim Update nachgetragen.
- Unter dem Warenwert steht, was im laufenden Jahr verkauft wurde (kg, Gebinde, Euro).
- Sammelmaßnahmen lassen sich als Ganzes bearbeiten. Auf der Seite eines Volks gibt es dafür einen Stift.
- Die Volkskachel zeigt Stärke und Futter aus der letzten Durchsicht, mit Datum. Werte älter als drei Wochen sind grau hinterlegt.
- Das Update erweitert die Datenbank um die Verkäufe. Vorhandene Daten bleiben erhalten, vorher wird wie immer eine Sicherung angelegt.

## 1.0.1

- Testzugänge und Styleguide sind Werkzeuge für die Entwicklung. Sie erscheinen bei selbst installierten Instanzen nicht mehr in den Einstellungen.
- Nach `sudo imkerei-update --zurueck` zeigt die App jetzt "Von Hand zurückgegangen" statt "Update hat nicht geklappt". Das gilt für Server, die ab dieser Version installiert werden.

## 1.0.0

- Erste öffentliche Version.
- Bienenstände, Völker und Stockkarten mit Fotos, Bewertung und Verlauf.
- Königinnen, Zucht und Belegstellen.
- Behandlungen mit Nachweis, Maßnahmen, Kalender.
- Lager für Material und Honig.
- Helfer-Zugänge mit Lese- oder Schreibrecht.
- Speichern ohne Netz am Stand.
- Installation per Skript, Updates per Knopf.
