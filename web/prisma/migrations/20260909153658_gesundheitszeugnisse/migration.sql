-- CreateTable
CREATE TABLE "Gesundheitszeugnis" (
    "id" TEXT NOT NULL,
    "bienenstandId" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "aussteller" TEXT,
    "notizen" TEXT,
    "dateiname" TEXT NOT NULL,
    "originalDateiname" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "groesse" INTEGER NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gesundheitszeugnis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Gesundheitszeugnis_bienenstandId_idx" ON "Gesundheitszeugnis"("bienenstandId");

-- AddForeignKey
ALTER TABLE "Gesundheitszeugnis" ADD CONSTRAINT "Gesundheitszeugnis_bienenstandId_fkey" FOREIGN KEY ("bienenstandId") REFERENCES "Bienenstand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
