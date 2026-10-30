-- CreateTable
CREATE TABLE "Dokumentkategorie" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vorgegeben" BOOLEAN NOT NULL DEFAULT false,
    "reihenfolge" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dokumentkategorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dokument" (
    "id" TEXT NOT NULL,
    "kategorieId" TEXT NOT NULL,
    "titel" TEXT,
    "datum" TIMESTAMP(3) NOT NULL,
    "notizen" TEXT,
    "dateiname" TEXT NOT NULL,
    "originalDateiname" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "groesse" INTEGER NOT NULL,
    "bienenstandId" TEXT,
    "koeniginId" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dokument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DokumentVolk" (
    "dokumentId" TEXT NOT NULL,
    "volkId" TEXT NOT NULL,

    CONSTRAINT "DokumentVolk_pkey" PRIMARY KEY ("dokumentId","volkId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dokumentkategorie_name_key" ON "Dokumentkategorie"("name");

-- CreateIndex
CREATE INDEX "Dokument_kategorieId_idx" ON "Dokument"("kategorieId");

-- CreateIndex
CREATE INDEX "Dokument_bienenstandId_idx" ON "Dokument"("bienenstandId");

-- CreateIndex
CREATE INDEX "Dokument_koeniginId_idx" ON "Dokument"("koeniginId");

-- CreateIndex
CREATE INDEX "DokumentVolk_volkId_idx" ON "DokumentVolk"("volkId");

-- AddForeignKey
ALTER TABLE "Dokument" ADD CONSTRAINT "Dokument_kategorieId_fkey" FOREIGN KEY ("kategorieId") REFERENCES "Dokumentkategorie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dokument" ADD CONSTRAINT "Dokument_bienenstandId_fkey" FOREIGN KEY ("bienenstandId") REFERENCES "Bienenstand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dokument" ADD CONSTRAINT "Dokument_koeniginId_fkey" FOREIGN KEY ("koeniginId") REFERENCES "Koenigin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DokumentVolk" ADD CONSTRAINT "DokumentVolk_dokumentId_fkey" FOREIGN KEY ("dokumentId") REFERENCES "Dokument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DokumentVolk" ADD CONSTRAINT "DokumentVolk_volkId_fkey" FOREIGN KEY ("volkId") REFERENCES "Volk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Vorgegebene Kategorien anlegen (Reihenfolge wie im Auswahlfeld).
INSERT INTO "Dokumentkategorie" ("id", "name", "vorgegeben", "reihenfolge") VALUES
    (gen_random_uuid()::text, 'Gesundheitszeugnis', true, 1),
    (gen_random_uuid()::text, 'Rechnung', true, 2),
    (gen_random_uuid()::text, 'Vertrag', true, 3),
    (gen_random_uuid()::text, 'Versicherung', true, 4),
    (gen_random_uuid()::text, 'Genehmigung', true, 5),
    (gen_random_uuid()::text, 'Anleitung', true, 6),
    (gen_random_uuid()::text, 'Sonstiges', true, 7);

-- Bestehende Gesundheitszeugnisse in die neue, allgemeine Dokumentenablage
-- übernehmen - Aussteller wandert dabei in die Notizen, weil das generische
-- Dokument kein eigenes Aussteller-Feld mehr hat.
INSERT INTO "Dokument" ("id", "kategorieId", "datum", "notizen", "dateiname", "originalDateiname", "mimeType", "groesse", "bienenstandId", "erstelltAm")
SELECT
    g."id",
    (SELECT "id" FROM "Dokumentkategorie" WHERE "name" = 'Gesundheitszeugnis'),
    g."datum",
    NULLIF(
        TRIM(BOTH E'\n' FROM
            COALESCE('Ausstellende Stelle: ' || g."aussteller", '') ||
            CASE WHEN g."aussteller" IS NOT NULL AND g."notizen" IS NOT NULL THEN E'\n' ELSE '' END ||
            COALESCE(g."notizen", '')
        ),
        ''
    ),
    g."dateiname",
    g."originalDateiname",
    g."mimeType",
    g."groesse",
    g."bienenstandId",
    g."erstelltAm"
FROM "Gesundheitszeugnis" g;

-- DropForeignKey
ALTER TABLE "Gesundheitszeugnis" DROP CONSTRAINT "Gesundheitszeugnis_bienenstandId_fkey";

-- DropTable
DROP TABLE "Gesundheitszeugnis";
