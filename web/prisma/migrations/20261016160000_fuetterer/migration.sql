-- Fütterer auf-/abgenommen je Stockkarteneintrag (nur bei Wechsel).
ALTER TABLE "StockkartenEintrag" ADD COLUMN "fuettererAktion" TEXT;
