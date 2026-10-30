# Imkereiverwaltung installieren

So bekommst du deine eigene Imkereiverwaltung auf einen eigenen Server. Die
App ist kostenlos, siehe [LIZENZ.md](../LIZENZ.md).

## Was du brauchst

- Einen kleinen Server (VPS) mit **Ubuntu 22.04/24.04 oder Debian 12**,
  mindestens 1 GB Arbeitsspeicher und 10 GB Festplatte. Zum Beispiel bei
  Hetzner, netcup oder IONOS, ab etwa 4 € im Monat.
- Eine **Adresse** (Domain oder Unteradresse), z.B. `imkerei.example.de`.
  Beim Domain-Anbieter einen **A-Eintrag** auf die IP-Adresse des Servers
  setzen. Ohne Adresse gibt es kein HTTPS, und ohne HTTPS klappt die
  Anmeldung nicht.
- Beim Server müssen die Ports **80 und 443** offen sein (Firewall beim
  Anbieter prüfen).

## Installieren

Am Server anmelden (z.B. `ssh root@<IP-Adresse>`) und eingeben:

```
curl -fsSL https://raw.githubusercontent.com/frawoer79/Imkerei_Verwaltung/main/installation/installieren.sh | sudo bash
```

Das Skript fragt nach der Adresse, installiert Docker, startet die App und
zeigt am Ende einen **Einrichtungscode**.

Dann im Browser `https://<deine Adresse>` öffnen. Der Einrichtungsassistent
fragt den Code ab und legt deinen Zugang an. Fertig.

## Wo liegt was

Alles liegt in `/opt/imkereiverwaltung`:

- `.env`: Adresse, Passwörter und Einrichtungscode. **Gut aufbewahren**, nie
  weitergeben.
- `docker-compose.yml` und `Caddyfile`: die Bauanleitung. Nicht ändern.
- `sicherungen/`: Sicherungen der Datenbank vor jedem Update.
- `steuerung/`: darüber bittet die App um ein Update. Nicht ändern.
- Daten und Fotos liegen in Docker-Volumes (`imkereiverwaltung_datenbank`,
  `imkereiverwaltung_dateien`). Sie bleiben bei Neustarts und Updates erhalten.

## Häufige Fragen

**App neu starten:** `cd /opt/imkereiverwaltung && docker compose restart`

**Protokoll ansehen:** `cd /opt/imkereiverwaltung && docker compose logs --tail 100 app`

**Passwort vergessen:** Deine Daten bleiben dabei erhalten.

```
cd /opt/imkereiverwaltung
docker compose exec app node scripts/hauptzugang-zuruecksetzen.mjs
docker compose restart app
```

Danach die Seite neu öffnen, der Einrichtungsassistent kommt wieder. Den
Einrichtungscode findest du in der `.env`.

**Kein HTTPS-Zertifikat:** Zeigt die Adresse wirklich auf den Server? Sind
Port 80 und 443 offen? Caddy versucht es von selbst immer wieder. Protokoll:
`docker compose logs caddy`.

## Updates

Einmal am Tag fragt die App bei GitHub nach, ob es eine neue Version gibt.
Gibt es eine, steht oben ein Hinweis (nur für deinen Zugang, nicht für
Helfer). "Was ist neu?" zeigt die Änderungen. Abschalten lässt sich das unter
Einstellungen → System. Dabei geht nur eine gewöhnliche Abfrage an GitHub,
keine Daten deiner Imkerei.

**Update einspielen:** unter Einstellungen → System auf "Update einspielen"
tippen. Oder am Server:

```
sudo imkerei-update
```

Beides macht dasselbe: Speicherplatz prüfen, neue Version laden, Datenbank
sichern, neue Version starten und prüfen, ob sie läuft. Startet sie nicht,
geht es von selbst zurück auf die alte Version mit der Sicherung von eben.
Protokoll: `/var/log/imkerei-update.log`.

**Zurück auf die Version vor dem letzten Update:**

```
sudo imkerei-update --zurueck
```

Achtung: Was seit dem Update eingetragen wurde, geht dabei verloren.

**Sicherungen** liegen in `/opt/imkereiverwaltung/sicherungen`, die letzten
5 bleiben. Fotos ändern sich durch Updates nicht und werden dort nicht
mitgesichert.

**Neue Hauptversion (z.B. 2.0):** kommt nie von selbst. Was zu tun ist, steht
dann in "Was ist neu?".

**Installation von vor dem Update-Befehl:** Gibt es `imkerei-update` bei dir
noch nicht, das Installationsskript einfach noch einmal aufrufen (siehe oben).
Deine Einstellungen und Daten bleiben dabei, wie sie sind.
