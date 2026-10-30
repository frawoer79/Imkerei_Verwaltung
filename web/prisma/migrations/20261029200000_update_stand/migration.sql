-- CreateTable
CREATE TABLE "UpdateStand" (
    "id" TEXT NOT NULL DEFAULT 'standard',
    "pruefungAn" BOOLEAN NOT NULL DEFAULT true,
    "letztePruefung" TIMESTAMP(3),
    "fehler" TEXT,
    "neuere" JSONB,
    "spaeterBis" TIMESTAMP(3),
    "uebersprungen" TEXT,

    CONSTRAINT "UpdateStand_pkey" PRIMARY KEY ("id")
);
