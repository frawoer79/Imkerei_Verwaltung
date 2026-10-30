-- Testzugänge: nur eine neue Tabelle, bestehende Daten bleiben unberührt.
CREATE TABLE "Testzugang" (
    "id" TEXT NOT NULL,
    "einladungToken" TEXT NOT NULL,
    "notiz" TEXT,
    "name" TEXT,
    "nameKlein" TEXT,
    "passwortHash" TEXT,
    "eingerichtetAm" TIMESTAMP(3),
    "letzteAnmeldung" TIMESTAMP(3),
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Testzugang_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Testzugang_einladungToken_key" ON "Testzugang"("einladungToken");

CREATE UNIQUE INDEX "Testzugang_nameKlein_key" ON "Testzugang"("nameKlein");
