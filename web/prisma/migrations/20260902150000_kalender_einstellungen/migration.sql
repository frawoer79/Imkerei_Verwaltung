-- Einstellungen für den Kalender-Feed: wann erinnert wird, in welcher Farbe
-- die Termine erscheinen sollen und wie ihr Titel aufgebaut ist. Alle drei
-- dürfen leer bleiben, dann gelten die bisherigen Vorgaben.

-- AlterTable
ALTER TABLE "Betrieb" ADD COLUMN "kalenderErinnerung" TEXT;
ALTER TABLE "Betrieb" ADD COLUMN "kalenderFarbe" TEXT;
ALTER TABLE "Betrieb" ADD COLUMN "kalenderTitel" TEXT;
