-- CreateEnum
CREATE TYPE "FuetterungsArt" AS ENUM ('INVERTZUCKERSIRUP', 'WEIZENSIRUP', 'ZUCKERWASSER_1_1', 'ZUCKERWASSER_3_2', 'FUTTERTEIG', 'EIWEISSFUTTERTEIG', 'SONSTIGE');

-- Bisherige Freitextfelder "futter" (Futtervorrat-Einschätzung) und
-- "fuetterungArt" (jetzt feste Auswahlliste statt Freitext) vorsorglich in
-- die Notizen übernehmen, damit nichts stillschweigend verloren geht.
UPDATE "StockkartenEintrag"
SET "notizen" = trim(both E'\n' from concat_ws(E'\n',
  CASE WHEN "futter" IS NOT NULL THEN 'Futtervorrat (alt): ' || "futter" END,
  CASE WHEN "fuetterungArt" IS NOT NULL THEN 'Fütterungsart (alt): ' || "fuetterungArt" END,
  "notizen"
))
WHERE "futter" IS NOT NULL OR "fuetterungArt" IS NOT NULL;

-- AlterTable
ALTER TABLE "StockkartenEintrag"
  DROP COLUMN "futter",
  DROP COLUMN "fuetterungArt",
  ADD COLUMN     "volksstaerkeEinschaetzung" INTEGER,
  ADD COLUMN     "futtermengeEinschaetzung" INTEGER,
  ADD COLUMN     "schwarmtrieb" INTEGER,
  ADD COLUMN     "wabensitz" INTEGER,
  ADD COLUMN     "honigGeerntet" BOOLEAN,
  ADD COLUMN     "honigRaehmchenAnzahl" INTEGER,
  ADD COLUMN     "honigart" TEXT,
  ADD COLUMN     "fuetterungArt" "FuetterungsArt";
