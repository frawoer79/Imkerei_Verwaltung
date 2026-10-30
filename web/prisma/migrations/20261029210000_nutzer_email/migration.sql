-- E-Mail-Adresse für Helfer und Link für "Passwort vergessen". Nur neue,
-- leere Spalten: vorhandene Helfer bleiben unverändert.
ALTER TABLE "Nutzer" ADD COLUMN "email" TEXT;
ALTER TABLE "Nutzer" ADD COLUMN "resetTokenHash" TEXT;
ALTER TABLE "Nutzer" ADD COLUMN "resetGueltigBis" TIMESTAMP(3);
ALTER TABLE "Nutzer" ADD COLUMN "resetAngefordertAm" TIMESTAMP(3);

CREATE UNIQUE INDEX "Nutzer_resetTokenHash_key" ON "Nutzer"("resetTokenHash");
