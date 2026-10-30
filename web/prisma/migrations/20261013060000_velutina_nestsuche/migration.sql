-- Velutina-Nestsuche: drei neue Tabellen, bestehende Daten bleiben unberührt.
-- CreateTable
CREATE TABLE "VelutinaNestsuche" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notiz" TEXT,
    "angelegtAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "abgeschlossenAm" TIMESTAMP(3),
    "nestBreitengrad" DOUBLE PRECISION,
    "nestLaengengrad" DOUBLE PRECISION,

    CONSTRAINT "VelutinaNestsuche_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VelutinaLocktopf" (
    "id" TEXT NOT NULL,
    "sucheId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "breitengrad" DOUBLE PRECISION NOT NULL,
    "laengengrad" DOUBLE PRECISION NOT NULL,
    "angelegtAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VelutinaLocktopf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VelutinaFlugbeobachtung" (
    "id" TEXT NOT NULL,
    "locktopfId" TEXT NOT NULL,
    "markierung" TEXT NOT NULL,
    "farbe" TEXT NOT NULL,
    "richtungGrad" DOUBLE PRECISION,
    "richtungQuelle" TEXT,
    "toleranzGrad" INTEGER NOT NULL DEFAULT 10,
    "rundzeitenSek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "abflugAm" TIMESTAMP(3),
    "notiz" TEXT,
    "angelegtAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VelutinaFlugbeobachtung_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VelutinaLocktopf_sucheId_idx" ON "VelutinaLocktopf"("sucheId");

-- CreateIndex
CREATE INDEX "VelutinaFlugbeobachtung_locktopfId_idx" ON "VelutinaFlugbeobachtung"("locktopfId");

-- AddForeignKey
ALTER TABLE "VelutinaLocktopf" ADD CONSTRAINT "VelutinaLocktopf_sucheId_fkey" FOREIGN KEY ("sucheId") REFERENCES "VelutinaNestsuche"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VelutinaFlugbeobachtung" ADD CONSTRAINT "VelutinaFlugbeobachtung_locktopfId_fkey" FOREIGN KEY ("locktopfId") REFERENCES "VelutinaLocktopf"("id") ON DELETE CASCADE ON UPDATE CASCADE;
