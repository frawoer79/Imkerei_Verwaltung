-- CreateTable
CREATE TABLE "Massnahme" (
    "id" TEXT NOT NULL,
    "stockkartenEintragId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "faelligAm" TIMESTAMP(3),
    "erledigt" BOOLEAN NOT NULL DEFAULT false,
    "erledigtAm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Massnahme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Massnahme_stockkartenEintragId_idx" ON "Massnahme"("stockkartenEintragId");

-- AddForeignKey
ALTER TABLE "Massnahme" ADD CONSTRAINT "Massnahme_stockkartenEintragId_fkey" FOREIGN KEY ("stockkartenEintragId") REFERENCES "StockkartenEintrag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bestehende Freitext-Maßnahmen als je eine offene, nicht terminierte
-- Maßnahme übernehmen, bevor die alte Spalte entfällt.
INSERT INTO "Massnahme" ("id", "stockkartenEintragId", "text", "erledigt", "createdAt")
SELECT gen_random_uuid()::text, "id", "massnahmen", false, COALESCE("createdAt", CURRENT_TIMESTAMP)
FROM "StockkartenEintrag"
WHERE "massnahmen" IS NOT NULL AND trim("massnahmen") <> '';

-- DropColumn
ALTER TABLE "StockkartenEintrag" DROP COLUMN "massnahmen";
