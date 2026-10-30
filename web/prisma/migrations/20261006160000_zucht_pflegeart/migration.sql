-- Pflegeart und Brutschrank für die Zuchtserie. Fügt nur einen neuen Typ und
-- zwei Spalten hinzu; vorhandene Serien bekommen "nicht angegeben" und keinen
-- Brutschrank, an ihren Daten ändert sich nichts.

-- CreateEnum
CREATE TYPE "Pflegeart" AS ENUM ('UNBEKANNT', 'WEISELLOS', 'WEISELRICHTIG', 'SAMMELBRUTABLEGER', 'ANBRUETER', 'STARTER_FINISHER');

-- AlterTable
ALTER TABLE "Zuchtserie" ADD COLUMN "pflegeart" "Pflegeart" NOT NULL DEFAULT 'UNBEKANNT',
ADD COLUMN "brutschrank" BOOLEAN NOT NULL DEFAULT false;
