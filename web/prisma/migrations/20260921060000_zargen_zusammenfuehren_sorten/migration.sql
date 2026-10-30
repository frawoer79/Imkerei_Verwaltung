-- ============================================================
-- 1) Volk.brutraumZargenAnzahl: neue Spalte, befüllt aus der bisherigen
--    Zarge.zargenAnzahl der gewählten Brutraum-Zarge, bevor diese Spalte
--    weiter unten verschwindet - die Betriebsweise ist ab jetzt eine
--    Eigenschaft des Volkes, nicht mehr der Zarge.
-- ============================================================
ALTER TABLE "Volk" ADD COLUMN "brutraumZargenAnzahl" INTEGER NOT NULL DEFAULT 1;

UPDATE "Volk" v
SET "brutraumZargenAnzahl" = z."zargenAnzahl"
FROM "Zarge" z
WHERE v."brutraumZargeId" = z.id;

-- ============================================================
-- 2) Zargen zusammenführen: Brutraum und Honigraum sind keine getrennten
--    Kategorien mehr - je Rähmchenmaß bleibt genau eine Zarge übrig.
--    Überlebende Zeile je Rähmchenmaß: bevorzugt die vormalige
--    Honigraum-Zarge (ihr Kilogramm-Wert stammt direkt aus den
--    Ernte-Durchschnittswerten und ist damit der verlässlichere), sonst die
--    älteste Zeile. Alle Verweise (aufgesetzte/geerntete Honigräume,
--    Honigernte-Anteile, Brutraum-Auswahl am Volk) wandern zur Überlebenden,
--    bevor die Dubletten gelöscht werden.
-- ============================================================
CREATE TEMP TABLE "_ZargeUeberlebende" AS
SELECT DISTINCT ON ("wabenmassId")
  "wabenmassId",
  id AS "ueberlebendeId"
FROM "Zarge"
ORDER BY "wabenmassId", (verwendung = 'HONIGRAUM') DESC, "createdAt" ASC, id ASC;

CREATE TEMP TABLE "_ZargeZuordnung" AS
SELECT z.id AS "alteId", u."ueberlebendeId"
FROM "Zarge" z
JOIN "_ZargeUeberlebende" u ON u."wabenmassId" = z."wabenmassId";

UPDATE "Honigraumaufsatz" h
SET "zargeId" = zu."ueberlebendeId"
FROM "_ZargeZuordnung" zu
WHERE h."zargeId" = zu."alteId" AND zu."alteId" != zu."ueberlebendeId";

UPDATE "HonigernteAnteil" a
SET "zargeId" = zu."ueberlebendeId"
FROM "_ZargeZuordnung" zu
WHERE a."zargeId" = zu."alteId" AND zu."alteId" != zu."ueberlebendeId";

UPDATE "Volk" v
SET "brutraumZargeId" = zu."ueberlebendeId"
FROM "_ZargeZuordnung" zu
WHERE v."brutraumZargeId" = zu."alteId" AND zu."alteId" != zu."ueberlebendeId";

DELETE FROM "Zarge" z
USING "_ZargeUeberlebende" u
WHERE z."wabenmassId" = u."wabenmassId" AND z.id != u."ueberlebendeId";

DROP TABLE "_ZargeZuordnung";
DROP TABLE "_ZargeUeberlebende";

-- ============================================================
-- 3) verwendung/zargenAnzahl werden an der Zarge nicht mehr gebraucht.
-- ============================================================
ALTER TABLE "Zarge" DROP COLUMN "verwendung",
DROP COLUMN "zargenAnzahl";

-- ============================================================
-- 4) Sorten-Katalog für Erzeugnisse (löst den bisher freien Text "sorte"
--    an ErzeugnisBuchung ab - analog zu Gebinde).
-- ============================================================
CREATE TABLE "Sorte" (
    "id" TEXT NOT NULL,
    "erzeugnistypId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vorgegeben" BOOLEAN NOT NULL DEFAULT false,
    "reihenfolge" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sorte_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Sorte_erzeugnistypId_idx" ON "Sorte"("erzeugnistypId");
CREATE UNIQUE INDEX "Sorte_erzeugnistypId_name_key" ON "Sorte"("erzeugnistypId", "name");

ALTER TABLE "ErzeugnisBuchung" ADD COLUMN "sorteId" TEXT;
CREATE INDEX "ErzeugnisBuchung_sorteId_idx" ON "ErzeugnisBuchung"("sorteId");

ALTER TABLE "Sorte" ADD CONSTRAINT "Sorte_erzeugnistypId_fkey" FOREIGN KEY ("erzeugnistypId") REFERENCES "Erzeugnistyp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ErzeugnisBuchung" ADD CONSTRAINT "ErzeugnisBuchung_sorteId_fkey" FOREIGN KEY ("sorteId") REFERENCES "Sorte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Bestehende freie Sortentexte in den Katalog übernehmen, bevor die alte
-- Spalte verschwindet - jede bisher getippte Sorte bleibt als eigener
-- (nicht vorgegebener) Katalogeintrag erhalten, nichts geht verloren.
INSERT INTO "Sorte" (id, "erzeugnistypId", name, vorgegeben, reihenfolge, "createdAt")
SELECT gen_random_uuid()::text, t."erzeugnistypId", t.sorte, false, 0, now()
FROM (SELECT DISTINCT "erzeugnistypId", sorte FROM "ErzeugnisBuchung" WHERE sorte IS NOT NULL) t;

UPDATE "ErzeugnisBuchung" eb
SET "sorteId" = s.id
FROM "Sorte" s
WHERE s."erzeugnistypId" = eb."erzeugnistypId" AND s.name = eb.sorte AND eb.sorte IS NOT NULL;

ALTER TABLE "ErzeugnisBuchung" DROP COLUMN "sorte";

-- Vorgegebene Honigsorten anlegen (Reihenfolge wie in der Auswahl) - die
-- ersten drei sind Tracht-Sammelbegriffe, die sechs danach die laut
-- Recherche gängigsten deutschen Sortenhonige. Per ON CONFLICT abgesichert,
-- falls oben schon ein gleichnamiger freier Text übernommen wurde.
INSERT INTO "Sorte" (id, "erzeugnistypId", name, vorgegeben, reihenfolge, "createdAt")
SELECT gen_random_uuid()::text, et.id, v.name, true, v.reihenfolge, now()
FROM "Erzeugnistyp" et
CROSS JOIN (VALUES
    ('Frühtracht', 1),
    ('Sommertracht', 2),
    ('Waldhonig', 3),
    ('Rapshonig', 4),
    ('Lindenhonig', 5),
    ('Kastanienhonig', 6),
    ('Akazienhonig (Robinie)', 7),
    ('Heidehonig', 8),
    ('Sonnenblumenhonig', 9)
) AS v(name, reihenfolge)
WHERE et.name = 'Honig'
ON CONFLICT ("erzeugnistypId", "name") DO UPDATE SET vorgegeben = true, reihenfolge = EXCLUDED.reihenfolge;
