-- Warenwert im Lager (freiwillig): Preis je Einheit und je Gebinde, Schalter.
ALTER TABLE "Erzeugnistyp" ADD COLUMN "preis" DOUBLE PRECISION;
ALTER TABLE "Gebinde" ADD COLUMN "preis" DOUBLE PRECISION;

CREATE TABLE "Lagereinstellung" (
    "id" TEXT NOT NULL DEFAULT 'standard',
    "warenwert" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lagereinstellung_pkey" PRIMARY KEY ("id")
);

-- Buchungen der Erzeugnisse als PDF.
ALTER TYPE "LagerlisteArt" ADD VALUE 'BUCHUNGEN';
ALTER TABLE "LagerlisteDatei" ADD COLUMN "zeitraum" TEXT;
