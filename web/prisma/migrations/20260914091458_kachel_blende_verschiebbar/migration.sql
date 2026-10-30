-- AlterTable
ALTER TABLE "Bienenstand" ADD COLUMN     "standortFotoBlendeBreite" DOUBLE PRECISION NOT NULL DEFAULT 0.55,
ADD COLUMN     "standortFotoBlendePosition" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
ALTER COLUMN "standortFotoFokusX" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "Volk" ADD COLUMN     "beuteFotoBlendeBreite" DOUBLE PRECISION NOT NULL DEFAULT 0.55,
ADD COLUMN     "beuteFotoBlendePosition" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
ALTER COLUMN "beuteFotoFokusX" SET DEFAULT 1;

-- Bisher wurde beuteFotoFokusX/standortFotoFokusX in der Anzeige ignoriert,
-- das Foto lag immer rechtsbündig. Jetzt wird der Wert wieder verwendet
-- (frei verschiebbar im Ausschnitt-Editor) - vorhandene Datensätze werden
-- hier auf 1 (rechtsbündig) gesetzt, damit sich am Aussehen bereits
-- gewählter Ausschnitte durch dieses Update nichts ändert.
UPDATE "Bienenstand" SET "standortFotoFokusX" = 1;
UPDATE "Volk" SET "beuteFotoFokusX" = 1;
