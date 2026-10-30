-- Beim Zurücksetzen des Passworts eines Testzugangs werden alle älteren
-- Sitzungen ungültig. Neue, leere Spalte - vorhandene Daten bleiben unberührt.
ALTER TABLE "Testzugang" ADD COLUMN "sitzungenGueltigAb" TIMESTAMP(3);
