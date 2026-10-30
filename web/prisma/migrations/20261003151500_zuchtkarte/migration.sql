-- Zuchtkarte: die erstellte, von Hand bearbeitbare Zuchtkarte einer Königin
-- (Felder als JSON). Fasst keine vorhandenen Daten an, legt nur eine neue
-- Tabelle an - bestehende Königinnen haben danach einfach noch keine Karte.

-- CreateTable
CREATE TABLE "Zuchtkarte" (
    "id" TEXT NOT NULL,
    "koeniginId" TEXT NOT NULL,
    "inhalt" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zuchtkarte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Zuchtkarte_koeniginId_key" ON "Zuchtkarte"("koeniginId");

-- AddForeignKey
ALTER TABLE "Zuchtkarte" ADD CONSTRAINT "Zuchtkarte_koeniginId_fkey" FOREIGN KEY ("koeniginId") REFERENCES "Koenigin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
