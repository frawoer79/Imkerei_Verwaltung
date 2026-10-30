-- CreateEnum
CREATE TYPE "VarroaZaehlweise" AS ENUM ('PUDERZUCKER', 'GEMUELLDIAGNOSE', 'SONSTIGE');

-- Bisheriges Freitextfeld "Brut" entfällt zugunsten der neuen, strukturierten
-- Sichtungsfelder (Stifte/Larven/verdeckelte Brut/Weiselzellen). Bestehende
-- Einträge werden vorsorglich nach "notizen" übernommen, damit nichts
-- stillschweigend verloren geht.
UPDATE "StockkartenEintrag"
SET "notizen" = trim(both E'\n' from concat_ws(E'\n', 'Brut (alt): ' || "brut", "notizen"))
WHERE "brut" IS NOT NULL;

-- AlterTable
ALTER TABLE "StockkartenEintrag"
  DROP COLUMN "brut",
  ADD COLUMN     "stifteGesehen" BOOLEAN,
  ADD COLUMN     "larvenGesehen" BOOLEAN,
  ADD COLUMN     "verdeckelteBrutGesehen" BOOLEAN,
  ADD COLUMN     "weiselzellenGesehen" BOOLEAN,
  ADD COLUMN     "bebrueteteWaben" INTEGER,
  ADD COLUMN     "leerwaben" INTEGER,
  ADD COLUMN     "mittelwaende" INTEGER,
  ADD COLUMN     "brutwaben" INTEGER,
  ADD COLUMN     "futterwaben" INTEGER,
  ADD COLUMN     "baurahmenDrohnenrahmen" INTEGER,
  ADD COLUMN     "varroaZaehlweise" "VarroaZaehlweise",
  ADD COLUMN     "varroaAnzahl" INTEGER,
  ADD COLUMN     "tierarzneimittel" TEXT,
  ADD COLUMN     "biotechnischeMassnahmen" TEXT,
  ADD COLUMN     "gesamteindruck" INTEGER,
  ADD COLUMN     "honigertragKg" DOUBLE PRECISION,
  ADD COLUMN     "fuetterungArt" TEXT,
  ADD COLUMN     "fuetterungMengeKg" DOUBLE PRECISION,
  ADD COLUMN     "gewichtKg" DOUBLE PRECISION;
