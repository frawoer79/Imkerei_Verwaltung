-- CreateEnum
CREATE TYPE "BioVerfahrenArt" AS ENUM ('TBE', 'TEIL_BRUTENTNAHME', 'BANNWABE', 'KOENIGIN_KAEFIGEN', 'SONSTIGES');

-- AlterTable
ALTER TABLE "Behandlung" ADD COLUMN     "bioVerfahrenId" TEXT;

-- AlterTable
ALTER TABLE "KoeniginEreignis" ADD COLUMN     "bioVerfahrenId" TEXT;

-- AlterTable
ALTER TABLE "Massnahme" ADD COLUMN     "bioSchritt" TEXT,
ADD COLUMN     "bioVerfahrenId" TEXT;

-- AlterTable
ALTER TABLE "StockkartenEintrag" ADD COLUMN     "drohnenbrutGeschnitten" BOOLEAN;

-- CreateTable
CREATE TABLE "BioVerfahren" (
    "id" TEXT NOT NULL,
    "art" "BioVerfahrenArt" NOT NULL,
    "bezeichnung" TEXT,
    "beginn" TIMESTAMP(3) NOT NULL,
    "anwender" TEXT NOT NULL,
    "bemerkung" TEXT,
    "brutwaben" INTEGER,
    "verbleib" TEXT,
    "fangwabe" BOOLEAN NOT NULL DEFAULT false,
    "kaefig" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BioVerfahren_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BioVerfahrenVolk" (
    "verfahrenId" TEXT NOT NULL,
    "volkId" TEXT NOT NULL,
    "volkNameDamals" TEXT NOT NULL,
    "standNameDamals" TEXT NOT NULL,

    CONSTRAINT "BioVerfahrenVolk_pkey" PRIMARY KEY ("verfahrenId","volkId")
);

-- CreateIndex
CREATE INDEX "BioVerfahren_beginn_idx" ON "BioVerfahren"("beginn");

-- CreateIndex
CREATE INDEX "BioVerfahrenVolk_volkId_idx" ON "BioVerfahrenVolk"("volkId");

-- CreateIndex
CREATE INDEX "Massnahme_bioVerfahrenId_idx" ON "Massnahme"("bioVerfahrenId");

-- AddForeignKey
ALTER TABLE "KoeniginEreignis" ADD CONSTRAINT "KoeniginEreignis_bioVerfahrenId_fkey" FOREIGN KEY ("bioVerfahrenId") REFERENCES "BioVerfahren"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Massnahme" ADD CONSTRAINT "Massnahme_bioVerfahrenId_fkey" FOREIGN KEY ("bioVerfahrenId") REFERENCES "BioVerfahren"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Behandlung" ADD CONSTRAINT "Behandlung_bioVerfahrenId_fkey" FOREIGN KEY ("bioVerfahrenId") REFERENCES "BioVerfahren"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BioVerfahrenVolk" ADD CONSTRAINT "BioVerfahrenVolk_verfahrenId_fkey" FOREIGN KEY ("verfahrenId") REFERENCES "BioVerfahren"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BioVerfahrenVolk" ADD CONSTRAINT "BioVerfahrenVolk_volkId_fkey" FOREIGN KEY ("volkId") REFERENCES "Volk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
