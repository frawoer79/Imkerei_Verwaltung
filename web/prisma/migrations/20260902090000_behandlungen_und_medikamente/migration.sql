-- Behandlungsdokumentation nach Art. 108 VO (EU) 2019/6 und § 2 THAMNV:
-- Medikamente werden einmal als Stammdaten samt Erwerbsbeleg angelegt, eine
-- Behandlung ist ein eigener Vorgang und kann mehrere Völker auf einmal
-- abdecken (so wie der amtliche Bestandsbuch-Vordruck aufgebaut ist).

-- CreateTable: Betriebsstammdaten (genau ein Datensatz, id "standard").
CREATE TABLE "Betrieb" (
    "id" TEXT NOT NULL DEFAULT 'standard',
    "halterName" TEXT NOT NULL,
    "strasse" TEXT,
    "plzOrt" TEXT,
    "telefon" TEXT,
    "email" TEXT,
    "registriernummer" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Betrieb_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medikament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wirkstoff" TEXT,
    "zulassungsnummer" TEXT,
    "einheit" TEXT NOT NULL DEFAULT 'ml',
    "wartezeitTage" INTEGER NOT NULL DEFAULT 0,
    "lieferant" TEXT,
    "kaufdatum" TIMESTAMP(3),
    "belegnummer" TEXT,
    "chargennummer" TEXT,
    "verfallsdatum" TIMESTAMP(3),
    "notizen" TEXT,
    "archiviert" BOOLEAN NOT NULL DEFAULT false,
    "archiviertAm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medikament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedikamentBeleg" (
    "id" TEXT NOT NULL,
    "medikamentId" TEXT NOT NULL,
    "dateiname" TEXT NOT NULL,
    "originalDateiname" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "groesse" INTEGER NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedikamentBeleg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Behandlung" (
    "id" TEXT NOT NULL,
    "medikamentId" TEXT NOT NULL,
    "indikation" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "endeDatum" TIMESTAMP(3),
    "mengeJeVolk" DOUBLE PRECISION NOT NULL,
    "wartezeitTage" INTEGER NOT NULL,
    "anwender" TEXT NOT NULL,
    "bemerkung" TEXT,
    "storniertAm" TIMESTAMP(3),
    "storniertGrund" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Behandlung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehandlungVolk" (
    "behandlungId" TEXT NOT NULL,
    "volkId" TEXT NOT NULL,
    "volkNameDamals" TEXT NOT NULL,
    "standNameDamals" TEXT NOT NULL,

    CONSTRAINT "BehandlungVolk_pkey" PRIMARY KEY ("behandlungId","volkId")
);

-- CreateIndex
CREATE INDEX "MedikamentBeleg_medikamentId_idx" ON "MedikamentBeleg"("medikamentId");
CREATE INDEX "Behandlung_datum_idx" ON "Behandlung"("datum");
CREATE INDEX "BehandlungVolk_volkId_idx" ON "BehandlungVolk"("volkId");

-- AddForeignKey
ALTER TABLE "MedikamentBeleg" ADD CONSTRAINT "MedikamentBeleg_medikamentId_fkey" FOREIGN KEY ("medikamentId") REFERENCES "Medikament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Behandlung" ADD CONSTRAINT "Behandlung_medikamentId_fkey" FOREIGN KEY ("medikamentId") REFERENCES "Medikament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BehandlungVolk" ADD CONSTRAINT "BehandlungVolk_behandlungId_fkey" FOREIGN KEY ("behandlungId") REFERENCES "Behandlung"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BehandlungVolk" ADD CONSTRAINT "BehandlungVolk_volkId_fkey" FOREIGN KEY ("volkId") REFERENCES "Volk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Das bisherige Freitextfeld "Tierarzneimittel" in der Stockkarte fällt weg:
-- Behandlungen werden ab jetzt strukturiert dokumentiert. Vorhandene Texte
-- werden vorher in die Notizen des jeweiligen Eintrags gerettet, damit nichts
-- verloren geht (die Angaben erfüllen die Nachweispflicht ohnehin nicht,
-- sollen aber lesbar bleiben).
UPDATE "StockkartenEintrag"
   SET "notizen" = COALESCE("notizen" || E'\n', '') || 'Tierarzneimittel (alter Eintrag): ' || "tierarzneimittel"
 WHERE "tierarzneimittel" IS NOT NULL AND btrim("tierarzneimittel") <> '';

ALTER TABLE "StockkartenEintrag" DROP COLUMN "tierarzneimittel";
