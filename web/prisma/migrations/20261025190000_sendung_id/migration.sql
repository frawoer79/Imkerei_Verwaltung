-- Kennung für nachgesendete Durchsichten (Warteschlange auf dem Handy), damit
-- ein doppelt ankommender Eintrag nur einmal gespeichert wird. Nur eine neue,
-- leere Spalte: vorhandene Einträge bleiben unverändert.
ALTER TABLE "StockkartenEintrag" ADD COLUMN "sendungId" TEXT;

CREATE UNIQUE INDEX "StockkartenEintrag_volkId_sendungId_key" ON "StockkartenEintrag"("volkId", "sendungId");
