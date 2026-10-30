#!/bin/sh
# Wird beim Start des Containers ausgeführt (siehe Dockerfile ENTRYPOINT).
# Läuft zunächst als root, genau deshalb: das Foto-Volume wird von Coolify
# erst jetzt eingehängt (nicht beim Bauen des Images) und gehört dann meist
# root - ohne diesen Schritt könnte der unprivilegierte Anwendungsnutzer
# keine Fotos speichern, alles andere (Text/Zahlen-Felder) würde aber
# trotzdem funktionieren, weil das keine Dateien schreibt.
set -e

UPLOAD_DIR="${UPLOAD_DIR:-/app/uploads}"
mkdir -p "$UPLOAD_DIR"
chown -R nextjs:nodejs "$UPLOAD_DIR"

# Ordner, über den die App um ein Update bittet (nur bei Installationen mit
# installation/docker-compose.yml, siehe installation/imkerei-update). Nur
# der Ordner selbst, die Statusdatei darin schreibt der Dienst auf dem Server.
if [ -n "$UPDATE_STEUERUNG" ] && [ -d "$UPDATE_STEUERUNG" ]; then
  chown nextjs:nodejs "$UPDATE_STEUERUNG"
fi

echo "Wende offene Datenbank-Migrationen an ..."
gosu nextjs npx prisma migrate deploy

# Testzugänge haben je ein eigenes Datenbank-Schema mit denselben Tabellen -
# die bekommen dieselben Migrationen (siehe scripts/tester-schemas-migrieren.mjs).
echo "Wende Migrationen auf die Testzugänge an ..."
gosu nextjs node scripts/tester-schemas-migrieren.mjs || echo "Testzugänge konnten nicht migriert werden - App startet trotzdem."

echo "Starte Next.js ..."
exec gosu nextjs npx next start -H 0.0.0.0 -p "${PORT:-3000}"
