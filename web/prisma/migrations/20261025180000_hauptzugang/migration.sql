-- CreateTable
CREATE TABLE "Hauptzugang" (
    "id" TEXT NOT NULL DEFAULT 'standard',
    "benutzername" TEXT NOT NULL,
    "passwortHash" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hauptzugang_pkey" PRIMARY KEY ("id")
);
