-- AlterTable
ALTER TABLE "Bienenstand" ADD COLUMN     "strasse" TEXT,
ADD COLUMN     "ort" TEXT;

-- Bestehende Freitext-Adressen vorerst komplett ins Feld "ort" übernehmen,
-- damit keine Daten stillschweigend verloren gehen. Aufteilung auf Straße
-- ggf. anschliessend manuell nachtragen.
UPDATE "Bienenstand" SET "ort" = "standort" WHERE "standort" IS NOT NULL;

ALTER TABLE "Bienenstand" DROP COLUMN "standort";
