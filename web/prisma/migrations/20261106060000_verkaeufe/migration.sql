-- Verkaufsliste: Erlös und Käufer an Lager-Abgängen, eigene Tabelle für
-- verkaufte Völker, Ableger und Königinnen. Bestehende Daten bleiben, nur
-- schon verkaufte Völker und Königinnen bekommen ihren Verkauf nachgetragen.

-- CreateEnum
CREATE TYPE "VerkaufArt" AS ENUM ('VOLK', 'ABLEGER', 'KOENIGIN', 'SONSTIGES');

-- AlterTable
ALTER TABLE "ErzeugnisBuchung" ADD COLUMN     "erloes" DOUBLE PRECISION,
ADD COLUMN     "kaeufer" TEXT;

-- CreateTable
CREATE TABLE "Verkauf" (
    "id" TEXT NOT NULL,
    "art" "VerkaufArt" NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "anzahl" INTEGER NOT NULL DEFAULT 1,
    "preis" DOUBLE PRECISION,
    "kaeufer" TEXT,
    "notiz" TEXT,
    "volkId" TEXT,
    "koeniginId" TEXT,
    "koeniginEreignisId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verkauf_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Verkauf_volkId_key" ON "Verkauf"("volkId");

-- CreateIndex
CREATE UNIQUE INDEX "Verkauf_koeniginEreignisId_key" ON "Verkauf"("koeniginEreignisId");

-- CreateIndex
CREATE INDEX "Verkauf_datum_idx" ON "Verkauf"("datum");

-- CreateIndex
CREATE INDEX "Verkauf_koeniginId_idx" ON "Verkauf"("koeniginId");

-- AddForeignKey
ALTER TABLE "Verkauf" ADD CONSTRAINT "Verkauf_volkId_fkey" FOREIGN KEY ("volkId") REFERENCES "Volk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verkauf" ADD CONSTRAINT "Verkauf_koeniginId_fkey" FOREIGN KEY ("koeniginId") REFERENCES "Koenigin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verkauf" ADD CONSTRAINT "Verkauf_koeniginEreignisId_fkey" FOREIGN KEY ("koeniginEreignisId") REFERENCES "KoeniginEreignis"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Bisher verkaufte Völker: Datum ist die letzte Änderung (genauer weiß es
-- die Datenbank nicht), Preis leer.
INSERT INTO "Verkauf" ("id", "art", "datum", "bezeichnung", "volkId", "updatedAt")
SELECT 'vk_' || "id", 'VOLK', "updatedAt", "name", "id", CURRENT_TIMESTAMP
FROM "Volk"
WHERE "status" = 'VERKAUFT';

-- Bisher verkaufte Königinnen: aus dem Ereignis "verkauft", die Bemerkung
-- (oft "an wen, zu welchem Preis") wandert als Notiz mit.
INSERT INTO "Verkauf" ("id", "art", "datum", "bezeichnung", "notiz", "koeniginId", "koeniginEreignisId", "updatedAt")
SELECT 'vk_' || e."id", 'KOENIGIN', e."datum", k."kennung", e."notiz", k."id", e."id", CURRENT_TIMESTAMP
FROM "KoeniginEreignis" e
JOIN "Koenigin" k ON k."id" = e."koeniginId"
WHERE e."art" = 'VERKAUFT';
