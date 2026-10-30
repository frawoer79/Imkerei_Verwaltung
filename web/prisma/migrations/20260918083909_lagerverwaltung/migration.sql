-- AlterTable
ALTER TABLE "Zarge" ADD COLUMN     "gesamtbestand" INTEGER;

-- CreateTable
CREATE TABLE "Materialartikel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "einheit" TEXT NOT NULL DEFAULT 'Stück',
    "bestand" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notizen" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Materialartikel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Erzeugnistyp" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "einheit" TEXT NOT NULL DEFAULT 'kg',
    "vorgegeben" BOOLEAN NOT NULL DEFAULT false,
    "reihenfolge" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Erzeugnistyp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErzeugnisBuchung" (
    "id" TEXT NOT NULL,
    "erzeugnistypId" TEXT NOT NULL,
    "menge" DOUBLE PRECISION NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grund" TEXT,
    "notizen" TEXT,
    "volkId" TEXT,
    "stockkartenEintragId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErzeugnisBuchung_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Erzeugnistyp_name_key" ON "Erzeugnistyp"("name");

-- CreateIndex
CREATE INDEX "ErzeugnisBuchung_erzeugnistypId_idx" ON "ErzeugnisBuchung"("erzeugnistypId");

-- CreateIndex
CREATE INDEX "ErzeugnisBuchung_volkId_idx" ON "ErzeugnisBuchung"("volkId");

-- CreateIndex
CREATE INDEX "ErzeugnisBuchung_stockkartenEintragId_idx" ON "ErzeugnisBuchung"("stockkartenEintragId");

-- AddForeignKey
ALTER TABLE "ErzeugnisBuchung" ADD CONSTRAINT "ErzeugnisBuchung_erzeugnistypId_fkey" FOREIGN KEY ("erzeugnistypId") REFERENCES "Erzeugnistyp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErzeugnisBuchung" ADD CONSTRAINT "ErzeugnisBuchung_volkId_fkey" FOREIGN KEY ("volkId") REFERENCES "Volk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErzeugnisBuchung" ADD CONSTRAINT "ErzeugnisBuchung_stockkartenEintragId_fkey" FOREIGN KEY ("stockkartenEintragId") REFERENCES "StockkartenEintrag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Vorgegebene Erzeugnistypen anlegen (Reihenfolge wie im Auswahlfeld).
INSERT INTO "Erzeugnistyp" ("id", "name", "einheit", "vorgegeben", "reihenfolge") VALUES
    (gen_random_uuid()::text, 'Honig', 'kg', true, 1),
    (gen_random_uuid()::text, 'Wachs', 'kg', true, 2),
    (gen_random_uuid()::text, 'Propolis', 'kg', true, 3),
    (gen_random_uuid()::text, 'Pollen', 'kg', true, 4);
