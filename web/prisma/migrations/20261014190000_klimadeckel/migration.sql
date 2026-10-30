-- Klimadeckel: ein Volk hat entweder einen Standarddeckel (klimadeckelId
-- leer, wird nirgends gezählt) oder einen Klimadeckel aus dem Lager. Die
-- Lager-Seite zählt daraus "im Einsatz" und "verfügbar" wie bei den Zargen.

-- AlterTable
ALTER TABLE "Materialartikel" ADD COLUMN     "klimadeckel" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Volk" ADD COLUMN     "klimadeckelId" TEXT;

-- CreateIndex
CREATE INDEX "Volk_klimadeckelId_idx" ON "Volk"("klimadeckelId");

-- AddForeignKey
ALTER TABLE "Volk" ADD CONSTRAINT "Volk_klimadeckelId_fkey" FOREIGN KEY ("klimadeckelId") REFERENCES "Materialartikel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Bereits als "Sonstiges Material" erfasste Klimadeckel (z.B. "Klimadeckel
-- Beelive") übernehmen, damit nichts doppelt gepflegt werden muss. Alle
-- vorhandenen Völker bleiben beim Standarddeckel.
UPDATE "Materialartikel" SET "klimadeckel" = true WHERE "name" ILIKE '%klimadeckel%';
