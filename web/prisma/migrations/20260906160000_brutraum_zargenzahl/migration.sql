-- Die Betriebsweise steckt jetzt in der Brutraum-Zarge selbst ("Zander ganz,
-- 2 Zargen") statt getrennt am Volk. So lassen sich ein- und zweiräumige
-- Betriebsweisen nebeneinander anlegen und je Volk auswählen.

ALTER TABLE "Zarge" ADD COLUMN "zargenAnzahl" INTEGER NOT NULL DEFAULT 1;

-- Falls schon eine Betriebsweise am Volk stand, in die Zarge übernehmen:
-- bei genau einer Zargenzahl je Brutraum ist das verlustfrei.
UPDATE "Zarge" z
SET "zargenAnzahl" = quelle.anzahl
FROM (
  SELECT "brutraumZargeId" AS zarge, MAX("brutraumAnzahl") AS anzahl
  FROM "Volk"
  WHERE "brutraumZargeId" IS NOT NULL
  GROUP BY "brutraumZargeId"
) AS quelle
WHERE z.id = quelle.zarge AND quelle.anzahl > 1;

ALTER TABLE "Volk" DROP COLUMN "brutraumAnzahl";
