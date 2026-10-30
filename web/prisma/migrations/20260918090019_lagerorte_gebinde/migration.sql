-- AlterTable
ALTER TABLE "ErzeugnisBuchung" ADD COLUMN     "anzahl" INTEGER,
ADD COLUMN     "gebindeId" TEXT,
ADD COLUMN     "lagerortId" TEXT,
ADD COLUMN     "sorte" TEXT;

-- AlterTable
ALTER TABLE "Materialartikel" ADD COLUMN     "lagerortId" TEXT;

-- CreateTable
CREATE TABLE "Lagerort" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notizen" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lagerort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gebinde" (
    "id" TEXT NOT NULL,
    "erzeugnistypId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inhalt" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gebinde_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lagerort_name_key" ON "Lagerort"("name");

-- CreateIndex
CREATE INDEX "Gebinde_erzeugnistypId_idx" ON "Gebinde"("erzeugnistypId");

-- CreateIndex
CREATE INDEX "ErzeugnisBuchung_gebindeId_idx" ON "ErzeugnisBuchung"("gebindeId");

-- CreateIndex
CREATE INDEX "ErzeugnisBuchung_lagerortId_idx" ON "ErzeugnisBuchung"("lagerortId");

-- CreateIndex
CREATE INDEX "Materialartikel_lagerortId_idx" ON "Materialartikel"("lagerortId");

-- AddForeignKey
ALTER TABLE "Materialartikel" ADD CONSTRAINT "Materialartikel_lagerortId_fkey" FOREIGN KEY ("lagerortId") REFERENCES "Lagerort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gebinde" ADD CONSTRAINT "Gebinde_erzeugnistypId_fkey" FOREIGN KEY ("erzeugnistypId") REFERENCES "Erzeugnistyp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErzeugnisBuchung" ADD CONSTRAINT "ErzeugnisBuchung_gebindeId_fkey" FOREIGN KEY ("gebindeId") REFERENCES "Gebinde"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErzeugnisBuchung" ADD CONSTRAINT "ErzeugnisBuchung_lagerortId_fkey" FOREIGN KEY ("lagerortId") REFERENCES "Lagerort"("id") ON DELETE SET NULL ON UPDATE CASCADE;
