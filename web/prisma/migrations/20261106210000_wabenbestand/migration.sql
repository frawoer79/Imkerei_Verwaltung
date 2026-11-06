-- Wabenbestand je Volk: Ist-Stand je Art beim Anlegen oder Nachtragen.
-- Bestehende Völker bleiben leer (= noch nicht erfasst), keine Daten
-- werden verändert.

-- AlterTable
ALTER TABLE "Volk" ADD COLUMN     "wabenBrut" INTEGER,
ADD COLUMN     "wabenFutter" INTEGER,
ADD COLUMN     "wabenLeer" INTEGER,
ADD COLUMN     "wabenMittelwaende" INTEGER,
ADD COLUMN     "wabenStandAm" TIMESTAMP(3);
