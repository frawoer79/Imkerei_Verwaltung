# Imkereiverwaltung

Webanwendung für Imker. Sie ersetzt Stockkarte, Bestandsbuch und
Lagerliste und hält alles an einem Ort zusammen.

Kostenlos für alle Imker. Lizenz kurz erklärt
in [LIZENZ.md](LIZENZ.md), rechtlich gilt [LICENSE](LICENSE).

## Auf allen Geräten dieselben Daten

Die App läuft im Browser, am PC, am Tablet und am Smartphone. Eine
Installation aus dem App-Store braucht es nicht. Auf dem Handy legst du sie
mit einem Tipp auf den Home-Bildschirm, dann startet sie wie eine App.

Deine Daten liegen auf deinem eigenen Server. Was du am Stand ins Handy
tippst, siehst du sofort am PC zu Hause und am Tablet. Kein Abgleich, kein
Export, nichts doppelt pflegen. Fällt am Stand das Netz aus, speichert die App
die Durchsicht zwischen und schickt sie nach, sobald wieder Empfang da ist.

Helfer bekommen einen eigenen Zugang, wahlweise mit Lese- und Schreibrecht
oder nur zum Lesen. Eine Historie zeigt, wer was geändert hat.

## Was die App kann

- **Bienenstände und Völker:** Stände mit Ort und Völkern, je Volk eine
  Stockkarte mit Beutensystem, Zargen, Königin, Fotos und dem ganzen
  Verlauf.
- **Durchsicht:** Brut, Waben, Varroa, Fütterung, Gewicht, Honigraum und
  Ernte. Bewertung mit Reglern für Volksstärke, Sanftmut, Wabensitz,
  Schwarmtrieb und mehr. Du füllst nur aus, was du gesehen hast. Mehrere Völker lassen sich auf einmal erfassen.
- **Varroa:** Puderzucker, Auswaschung oder Gemülldiagnose. Die App rechnet
  auf Milben je Tag oder Prozent um und vergleicht mit der Schadschwelle der
  Jahreszeit.
- **Maßnahmen und Kalender:** Was zu tun ist, über alle Völker hinweg, mit
  Terminen und Farben für überfällig, heute und bald. Auf Wunsch als
  Kalender-Abo im eigenen Kalender am Handy oder PC.
- **Königinnen und Zucht:** Bestand mit Jahrgang, Abstammung und Noten von
  1,0 bis 6,0 aus den Durchsichten.
  Zuchtserien mit Zeitplan vom Umlarven bis zur Eilage, jeder Schritt als
  Maßnahme.
- **Behandlungen:** Bestandsbuch für Tierarzneimittel mit Vorlagen für die
  gängigen Varroa-Mittel, Wartezeit und Nachweis als PDF. Dazu Verfahren
  ohne Medikament wie TBE oder Bannwabe mit Fahrplan.
- **Lager:** Material wie Zargen und Klimadeckel, die App rechnet selbst,
  was gerade im Einsatz ist. Erzeugnisse wie Honig, Wachs und Propolis mit
  Einlagern, Auslagern und Abfüllen in Gläser, auf Wunsch mit Warenwert und
  Lagerlisten als PDF.
- **Dokumente:** Gesundheitszeugnisse, Rechnungen, Verträge und mehr, mit
  Ständen, Völkern oder Königinnen verknüpft und per E-Mail verschickbar.
- **QR-Codes:** Aufkleber an der Beute scannen und die Stockkarte ist
  offen.
- **Asiatische Hornisse:** Warnung bei neuen Fundmeldungen rund um deine
  Stände (nur Baden-Württemberg, Daten der LUBW) und Nestsuche per Locktopf
  mit Karte.
- **Nach deinem Geschmack:** Bereiche, die du nicht brauchst, schaltest du
  ab. Drei Designs, jeweils hell und dunkel.

## Anleitung

Wie die App aussieht und funktioniert, zeigt die [Anleitung mit Bildern](ANLEITUNG.md).
Dieselbe Anleitung steht in der App unter dem Menüpunkt *Anleitung*.

## Selbst installieren

Du brauchst einen kleinen eigenen Server (ab etwa 4 € im Monat) und eine
Adresse dafür. Die Installation ist ein einziger Befehl, danach führt ein
Assistent durch die Einrichtung. Schritt für Schritt in
[installation/LIESMICH.md](installation/LIESMICH.md).

Neue Versionen meldet die App selbst. Einspielen geht per Knopf unter
Einstellungen → System. Was sich ändert, steht in
[AENDERUNGEN.md](AENDERUNGEN.md) und unter
[Releases](https://github.com/frawoer79/Imkerei_Verwaltung/releases).

## Fehler und Wünsche

Bitte als [Issue](https://github.com/frawoer79/Imkerei_Verwaltung/issues)
melden, am besten mit Screenshot und einer kurzen Beschreibung, was du
gemacht hast.

## Für Entwickler

Der Code liegt in [`web/`](web/): Next.js, TypeScript, PostgreSQL über
Prisma. Lokales Einrichten steht in [web/README.md](web/README.md).
