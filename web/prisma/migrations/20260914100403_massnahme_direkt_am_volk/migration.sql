-- AlterTable
ALTER TABLE "Massnahme" ADD COLUMN     "volkId" TEXT,
ALTER COLUMN "stockkartenEintragId" DROP NOT NULL;

-- Bestehende Maßnahmen hingen bisher zwingend an einem Stockkarten-Eintrag -
-- volkId für sie aus dessen Volk übernehmen, damit sie weiterhin ihrem Volk
-- zugeordnet sind, auch wenn Maßnahmen ab jetzt direkt am Volk hängen.
UPDATE "Massnahme" m
SET "volkId" = se."volkId"
FROM "StockkartenEintrag" se
WHERE m."stockkartenEintragId" = se."id";

ALTER TABLE "Massnahme" ALTER COLUMN "volkId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Massnahme_volkId_idx" ON "Massnahme"("volkId");

-- AddForeignKey
ALTER TABLE "Massnahme" ADD CONSTRAINT "Massnahme_volkId_fkey" FOREIGN KEY ("volkId") REFERENCES "Volk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
