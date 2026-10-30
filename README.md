# Imkereiverwaltung

Webanwendung für Imker: Bienenstände, Völker, Stockkarten mit Fotos,
Königinnen und Zucht, Behandlungen mit Nachweis, Maßnahmen und Kalender,
Lager für Material und Honig. Läuft im Browser am Rechner und am Handy, auch
mit kurzen Funklöchern am Stand.

Kostenlos für alle Imker. Lizenz kurz erklärt
in [LIZENZ.md](LIZENZ.md), rechtlich gilt [LICENSE](LICENSE).

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
