-- Änderungsprotokoll (siehe web/src/lib/historie.ts). Nur neue Tabelle:
-- vorhandene Daten bleiben unverändert, das Protokoll beginnt leer.
CREATE TABLE "Historie" (
    "id" TEXT NOT NULL,
    "zeitpunkt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kontoArt" TEXT NOT NULL,
    "nutzerId" TEXT,
    "nutzerName" TEXT NOT NULL,
    "aktion" TEXT NOT NULL,
    "modell" TEXT NOT NULL,
    "datensatzId" TEXT,
    "vorher" JSONB,
    "nachher" JSONB,
    "volkId" TEXT,
    "bienenstandId" TEXT,

    CONSTRAINT "Historie_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Historie_zeitpunkt_idx" ON "Historie"("zeitpunkt");
CREATE INDEX "Historie_modell_datensatzId_idx" ON "Historie"("modell", "datensatzId");
CREATE INDEX "Historie_volkId_idx" ON "Historie"("volkId");
