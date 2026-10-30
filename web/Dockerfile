# Baut die Next.js-App als eigenständiges Docker-Image für den Betrieb auf
# Coolify. Drei Stufen (mehrstufiger Build):
#   1. deps    - installiert alle Abhängigkeiten (auch die nur fürs Bauen nötigen)
#   2. builder - erzeugt den Prisma-Client und baut die Produktions-App
#   3. runner  - schlankes Endbild: nur Produktions-Abhängigkeiten + Build-Ergebnis
#
# Warum node:22-slim statt "alpine": Prisma lädt beim Installieren passende
# Programmdateien (Engines) für das jeweilige Betriebssystem herunter - für
# "slim" (Debian) klappt das ohne Zusatzkonfiguration, bei Alpine (andere
# Systembibliothek "musl") müsste man das im Schema extra angeben.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Ohne das läuft der Server in der Zeitzone des Containers (bei Hetzner UTC) -
# "jetzt" (z.B. Vorbelegung von Datum/Uhrzeit beim Stockkarten-Eintrag) wäre
# dann während der Sommerzeit 2 Stunden, im Winter 1 Stunde hinter Franks
# tatsächlicher Zeit. Europe/Berlin statt einer festen Verschiebung, damit
# die Umstellung Sommer-/Winterzeit automatisch mitgeht.
ENV TZ=Europe/Berlin

# Eigener, unprivilegierter Nutzer statt root - falls die Anwendung jemals
# eine Sicherheitslücke hat, begrenzt das den möglichen Schaden. Der
# Container startet trotzdem als root (kein USER hier) und wechselt erst im
# Entrypoint-Skript zu diesem Nutzer, siehe dort - der Grund: das
# Foto-Volume wird von Coolify erst beim Containerstart eingehängt (nicht
# beim Bauen des Images) und gehört dann meist root, gebraucht also root-
# Rechte, um es einmalig auf den richtigen Besitzer zu setzen.
RUN groupadd --gid 1001 nodejs && useradd --uid 1001 --gid nodejs --create-home nextjs

# "gosu": wechselt im Entrypoint-Skript sauber vom root-Start zum
# unprivilegierten Nutzer, bevor die eigentliche Anwendung läuft.
RUN apt-get update && apt-get install -y --no-install-recommends gosu \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma7.config.ts ./prisma7.config.ts
COPY --from=builder /app/scripts ./scripts
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && chown -R nextjs:nodejs /app

EXPOSE 3000
ENV PORT=3000

# Versionsnummer, z.B. "1.4.0". Setzt nur GitHub Actions beim Freigeben einer
# Version (.github/workflows/release.yml). Beim Bau über Coolify bleibt sie
# leer, dann gibt es in der App keine Update-Prüfung (siehe lib/update.ts).
# Steht bewusst weit unten: eine neue Nummer baut nur diese letzte Stufe neu.
ARG IMKEREI_APP_VERSION=""
ENV IMKEREI_APP_VERSION=$IMKEREI_APP_VERSION
LABEL org.opencontainers.image.version=$IMKEREI_APP_VERSION

# Beim Start wird zuerst das Foto-Volume für den unprivilegierten Nutzer
# beschreibbar gemacht, dann die Datenbank auf den neuesten Stand gebracht
# (offene Migrationen anwenden) und danach der Server gestartet. So holt
# jedes Deployment automatisch neue Datenbank-Änderungen nach.
ENTRYPOINT ["./docker-entrypoint.sh"]
