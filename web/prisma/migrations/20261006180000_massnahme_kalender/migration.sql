-- Maßnahmen können aus dem Kalender-Abo herausgenommen werden. Eigene
-- Maßnahmen bleiben alle im Kalender (Standard true). Bei den Schritten
-- schon angelegter Zuchtserien bleiben nur die Arbeitstermine drin, die
-- Kontrollschritte fallen heraus - wie bei neuen Serien (web/src/lib/zucht.ts).
-- Lässt sich je Schritt auf der Seite der Zuchtserie wieder umstellen.

-- AlterTable
ALTER TABLE "Massnahme" ADD COLUMN "imKalender" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Massnahme"
SET "imKalender" = false
WHERE "zuchtserieId" IS NOT NULL
  AND "zuchtSchritt" NOT IN (
    'PFLEGEVOLK_VORBEREITEN',
    'ZUCHTWABE_EINHAENGEN',
    'UMLARVEN',
    'IN_FINISHER_UMHAENGEN',
    'ZELLEN_KAEFIGEN',
    'VERSCHULEN',
    'ZUR_BEGATTUNG',
    'EILAGE_KONTROLLIEREN'
  );
