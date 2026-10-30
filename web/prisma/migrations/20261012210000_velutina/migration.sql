-- Velutina-Warnung: drei neue Tabellen, bestehende Daten bleiben unberührt.
CREATE TABLE "VelutinaMeldung" (
    "id" TEXT NOT NULL,
    "art" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "eingestelltAm" TIMESTAMP(3),
    "meldungsNr" TEXT,
    "breitengrad" DOUBLE PRECISION NOT NULL,
    "laengengrad" DOUBLE PRECISION NOT NULL,
    "unschaerfeM" DOUBLE PRECISION,
    "erstmalsAbgerufenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "zuletztGesehenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VelutinaMeldung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VelutinaAbruf" (
    "id" TEXT NOT NULL DEFAULT 'standard',
    "letzterVersuch" TIMESTAMP(3),
    "letzterErfolg" TIMESTAMP(3),
    "fehler" TEXT,
    "anzahl" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VelutinaAbruf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VelutinaEinstellung" (
    "id" TEXT NOT NULL DEFAULT 'standard',
    "akutRadiusM" INTEGER NOT NULL DEFAULT 2000,
    "warnRadiusM" INTEGER NOT NULL DEFAULT 5000,
    "gesehenBis" TIMESTAMP(3),
    "mailAn" BOOLEAN NOT NULL DEFAULT true,
    "mailGeprueftBis" TIMESTAMP(3),

    CONSTRAINT "VelutinaEinstellung_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VelutinaMeldung_datum_idx" ON "VelutinaMeldung"("datum");

