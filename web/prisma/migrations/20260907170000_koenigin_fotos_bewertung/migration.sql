-- Foto der Königin (im Kopf ihrer Seite), Fotos an einzelnen Stationen des
-- Lebenslaufs und übernommene Beurteilungen aus der Stockkarte.

ALTER TYPE "KoeniginEreignisArt" ADD VALUE 'BEWERTUNG' BEFORE 'SONSTIGES';

ALTER TABLE "Koenigin" ADD COLUMN "fotoDateiname" TEXT;
ALTER TABLE "Koenigin" ADD COLUMN "fotoOriginalDateiname" TEXT;
ALTER TABLE "Koenigin" ADD COLUMN "fotoMimeType" TEXT;

ALTER TABLE "KoeniginEreignis" ADD COLUMN "fotoDateiname" TEXT;
ALTER TABLE "KoeniginEreignis" ADD COLUMN "fotoOriginalDateiname" TEXT;
ALTER TABLE "KoeniginEreignis" ADD COLUMN "fotoMimeType" TEXT;

-- Herkunft einer übernommenen Beurteilung: die Zahlen bleiben am
-- Stockkarten-Eintrag, das Ereignis verweist nur darauf.
ALTER TABLE "KoeniginEreignis" ADD COLUMN "stockkartenEintragId" TEXT;
ALTER TABLE "KoeniginEreignis" ADD CONSTRAINT "KoeniginEreignis_stockkartenEintragId_fkey"
  FOREIGN KEY ("stockkartenEintragId") REFERENCES "StockkartenEintrag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
