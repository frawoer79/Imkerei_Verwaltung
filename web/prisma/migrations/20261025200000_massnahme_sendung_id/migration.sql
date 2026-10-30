-- Kennung für nachgesendete Maßnahmen (Warteschlange auf dem Handy), wie bei
-- StockkartenEintrag. Nur eine neue, leere Spalte: vorhandene Maßnahmen
-- bleiben unverändert.
ALTER TABLE "Massnahme" ADD COLUMN "sendungId" TEXT;

CREATE UNIQUE INDEX "Massnahme_volkId_sendungId_key" ON "Massnahme"("volkId", "sendungId");
