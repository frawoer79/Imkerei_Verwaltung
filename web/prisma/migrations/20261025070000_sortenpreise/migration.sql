-- Warenwert je Sorte: Preis je kg der Sorte und Preis je Stück für Sorte + Gebinde.
ALTER TABLE "Sorte" ADD COLUMN "preis" DOUBLE PRECISION;

CREATE TABLE "SortenGebindePreis" (
    "sorteId" TEXT NOT NULL,
    "gebindeId" TEXT NOT NULL,
    "preis" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SortenGebindePreis_pkey" PRIMARY KEY ("sorteId","gebindeId")
);

CREATE INDEX "SortenGebindePreis_gebindeId_idx" ON "SortenGebindePreis"("gebindeId");

ALTER TABLE "SortenGebindePreis" ADD CONSTRAINT "SortenGebindePreis_sorteId_fkey" FOREIGN KEY ("sorteId") REFERENCES "Sorte"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SortenGebindePreis" ADD CONSTRAINT "SortenGebindePreis_gebindeId_fkey" FOREIGN KEY ("gebindeId") REFERENCES "Gebinde"("id") ON DELETE CASCADE ON UPDATE CASCADE;
