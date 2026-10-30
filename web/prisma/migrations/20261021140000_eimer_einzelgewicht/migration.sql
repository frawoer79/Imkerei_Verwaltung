-- Freiwillig: Eimer und Hobbocks einzeln mit echtem Gewicht führen (Schalter je Erzeugnis).
-- Rein additiv, vorhandene Buchungen bleiben unverändert.
-- AlterTable
ALTER TABLE "ErzeugnisBuchung" ADD COLUMN     "eimerId" TEXT;

-- AlterTable
ALTER TABLE "Erzeugnistyp" ADD COLUMN     "eimerEinzeln" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Eimer" (
    "id" TEXT NOT NULL,
    "erzeugnistypId" TEXT NOT NULL,
    "nummer" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Eimer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Eimer_erzeugnistypId_nummer_key" ON "Eimer"("erzeugnistypId", "nummer");

-- CreateIndex
CREATE INDEX "ErzeugnisBuchung_eimerId_idx" ON "ErzeugnisBuchung"("eimerId");

-- AddForeignKey
ALTER TABLE "Eimer" ADD CONSTRAINT "Eimer_erzeugnistypId_fkey" FOREIGN KEY ("erzeugnistypId") REFERENCES "Erzeugnistyp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErzeugnisBuchung" ADD CONSTRAINT "ErzeugnisBuchung_eimerId_fkey" FOREIGN KEY ("eimerId") REFERENCES "Eimer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

