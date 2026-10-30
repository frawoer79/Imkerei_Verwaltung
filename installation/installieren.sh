#!/usr/bin/env bash
# Installiert die Imkereiverwaltung auf einem frischen Server mit Ubuntu oder
# Debian. Aufruf als root:
#
#   curl -fsSL https://raw.githubusercontent.com/frawoer79/Imkerei_Verwaltung/main/installation/installieren.sh | sudo bash
#
# Oder mit Adresse gleich dazu:
#
#   ... | sudo bash -s -- imkerei.example.de
#
# Was passiert:
#   1. Docker wird installiert, falls es fehlt.
#   2. Im Ordner /opt/imkereiverwaltung entstehen docker-compose.yml,
#      Caddyfile und .env (mit zufälligen Passwörtern).
#   3. Der Befehl imkerei-update (Updates mit Sicherung) und der Dienst für den
#      Update-Knopf in der App werden eingerichtet.
#   4. App, Datenbank und Caddy starten. Caddy holt das HTTPS-Zertifikat.
#   5. Am Ende steht die Adresse und der Einrichtungscode für den ersten Start.
#
# Mehrfach aufrufen schadet nicht: eine vorhandene .env bleibt, wie sie ist.

set -euo pipefail

ORDNER="${IMKEREI_ORDNER:-/opt/imkereiverwaltung}"
QUELLE="${IMKEREI_QUELLE:-https://raw.githubusercontent.com/frawoer79/Imkerei_Verwaltung/main/installation}"

hinweis() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warnung() { printf '\n\033[1;33mAchtung: %s\033[0m\n' "$*"; }
abbruch() { printf '\n\033[1;31mFehler: %s\033[0m\n' "$*" >&2; exit 1; }

# Liegt das Skript in einer heruntergeladenen Kopie des Repositorys, kommen
# die übrigen Dateien von dort statt aus dem Internet.
skript_ordner=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
  skript_ordner="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

zufall() { tr -dc 'a-f0-9' </dev/urandom | head -c "$1" || true; }

# --- Voraussetzungen --------------------------------------------------------

[ "$(id -u)" -eq 0 ] || abbruch "Bitte als root starten (mit sudo davor)."
command -v apt-get >/dev/null || abbruch "Dieses Skript kennt nur Ubuntu und Debian."

ram_mb=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
if [ "$ram_mb" -lt 900 ]; then
  warnung "Der Server hat nur ${ram_mb} MB Arbeitsspeicher. Empfohlen ist mindestens 1 GB."
fi
frei_gb=$(df -Pk / | awk 'NR==2 {print int($4/1024/1024)}')
if [ "$frei_gb" -lt 5 ]; then
  warnung "Auf der Festplatte sind nur ${frei_gb} GB frei. Empfohlen sind mindestens 5 GB."
fi

# --- Adresse ----------------------------------------------------------------

mkdir -p "$ORDNER"
cd "$ORDNER"

if [ -f .env ]; then
  hinweis "Vorhandene Einstellungen in $ORDNER/.env gefunden, sie bleiben unverändert."
  DOMAIN=$(grep -E '^DOMAIN=' .env | cut -d= -f2-)
else
  DOMAIN="${1:-}"
  if [ -z "$DOMAIN" ]; then
    echo
    echo "Unter welcher Adresse soll die App erreichbar sein?"
    echo "Beispiel: imkerei.example.de (ohne https://)"
    echo "Die Adresse muss schon auf diesen Server zeigen (A-Eintrag beim Domain-Anbieter)."
    read -r -p "Adresse: " DOMAIN </dev/tty
  fi
  DOMAIN=$(echo "$DOMAIN" | sed -E 's#^https?://##; s#/.*$##' | tr '[:upper:]' '[:lower:]')
  [ -n "$DOMAIN" ] || abbruch "Ohne Adresse geht es nicht."
fi

server_ips=$(hostname -I 2>/dev/null || true)
domain_ip=$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1 {print $1}' || true)
if [ -z "$domain_ip" ]; then
  warnung "Die Adresse $DOMAIN zeigt noch auf keinen Server. Ohne das gibt es kein HTTPS-Zertifikat. Die Installation läuft trotzdem weiter, Caddy versucht es später von selbst noch einmal."
elif ! echo " $server_ips " | grep -q " $domain_ip "; then
  warnung "$DOMAIN zeigt auf $domain_ip, dieser Server hat aber: $server_ips. Wenn der Server hinter einem Router steht, ist das in Ordnung. Sonst den A-Eintrag prüfen."
fi

# --- Docker -----------------------------------------------------------------

if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
  hinweis "Installiere Docker ..."
  apt-get update -qq
  apt-get install -y -qq curl ca-certificates >/dev/null
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker >/dev/null 2>&1 || true

# --- Dateien ----------------------------------------------------------------

hinweis "Lade die Bauanleitung der App nach $ORDNER ..."
for datei in docker-compose.yml Caddyfile; do
  if [ -n "$skript_ordner" ] && [ -f "$skript_ordner/$datei" ]; then
    [ "$skript_ordner" = "$ORDNER" ] || cp "$skript_ordner/$datei" "$datei"
  else
    curl -fsSL "$QUELLE/$datei" -o "$datei" || abbruch "Konnte $datei nicht laden."
  fi
done

# Update-Befehl und der Dienst für den Update-Knopf in der App.
hinweis "Richte den Update-Befehl imkerei-update ein ..."
for datei in imkerei-update imkerei-update.path imkerei-update.service; do
  if [ -n "$skript_ordner" ] && [ -f "$skript_ordner/$datei" ]; then
    cp "$skript_ordner/$datei" "/tmp/$datei.neu"
  else
    curl -fsSL "$QUELLE/$datei" -o "/tmp/$datei.neu" || abbruch "Konnte $datei nicht laden."
  fi
done
install -m 755 /tmp/imkerei-update.neu /usr/local/sbin/imkerei-update
sed "s#/opt/imkereiverwaltung#$ORDNER#g" /tmp/imkerei-update.path.neu > /etc/systemd/system/imkerei-update.path
sed "s#^ExecStart=.*#ExecStart=/usr/bin/env IMKEREI_ORDNER=$ORDNER /usr/local/sbin/imkerei-update --aus-app#" \
  /tmp/imkerei-update.service.neu > /etc/systemd/system/imkerei-update.service
rm -f /tmp/imkerei-update.neu /tmp/imkerei-update.path.neu /tmp/imkerei-update.service.neu
mkdir -p steuerung sicherungen
chmod 700 sicherungen
if ! { systemctl daemon-reload && systemctl enable --now imkerei-update.path; } >/dev/null 2>&1; then
  warnung "Der Dienst für den Update-Knopf ließ sich nicht starten. Updates gehen trotzdem mit: sudo imkerei-update"
fi

if [ ! -f .env ]; then
  code="$(zufall 4)-$(zufall 4)"
  umask 077
  cat > .env <<ENV
# Angelegt vom Installationsskript am $(date +%Y-%m-%d). Nicht weitergeben.
DOMAIN=$DOMAIN
DB_PASSWORT=$(zufall 32)
ANMELDUNG_GEHEIMNIS=$(zufall 64)
EINRICHTUNG_CODE=$code
IMKEREI_VERSION=1
ENV
  umask 022
fi
chmod 600 .env
EINRICHTUNG_CODE=$(grep -E '^EINRICHTUNG_CODE=' .env | cut -d= -f2-)

# --- Firewall ---------------------------------------------------------------

if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  hinweis "Öffne die Ports 80 und 443 in der Firewall ..."
  ufw allow 80/tcp >/dev/null
  ufw allow 443 >/dev/null
fi

# --- Start ------------------------------------------------------------------

hinweis "Lade die App und starte sie. Das dauert beim ersten Mal ein paar Minuten ..."
docker compose pull -q --ignore-pull-failures
docker compose up -d

hinweis "Warte, bis die App bereit ist ..."
for _ in $(seq 1 60); do
  zustand=$(docker inspect --format '{{.State.Health.Status}}' "$(docker compose ps -q app)" 2>/dev/null || echo "unbekannt")
  [ "$zustand" = "healthy" ] && break
  sleep 5
done
if [ "${zustand:-}" != "healthy" ]; then
  warnung "Die App meldet sich noch nicht als bereit. Protokoll ansehen mit: cd $ORDNER && docker compose logs app"
fi

cat <<FERTIG

  Fertig. Öffne im Browser:

      https://$DOMAIN

  Einrichtungscode für den ersten Start:

      $EINRICHTUNG_CODE

  Er steht auch in $ORDNER/.env. Bewahre diese Datei gut auf,
  ohne sie lässt sich eine Sicherung nicht vollständig zurückspielen.

FERTIG
