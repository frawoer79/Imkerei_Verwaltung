-- Königinnen als eigene Datensätze statt bloßer Felder am Volk: mit
-- Abstammung, Begattung (Belegstelle/Stand) und Lebenslauf. Bestehende
-- Angaben (Jahrgang, Zeichen) ziehen automatisch in einen Königin-Datensatz
-- um, damit nichts von Hand nacherfasst werden muss.

CREATE TYPE "KoeniginHerkunft" AS ENUM ('EIGENE_NACHZUCHT', 'NACHSCHAFFUNG', 'ZUGEFLOGEN', 'ZUKAUF', 'UNBEKANNT');
CREATE TYPE "Begattungsart" AS ENUM ('BELEGSTELLE', 'STANDBEGATTUNG', 'KUENSTLICHE_BESAMUNG', 'UNBEKANNT');
CREATE TYPE "KoeniginStatus" AS ENUM ('IM_VOLK', 'RESERVE', 'VERKAUFT', 'VERSTORBEN', 'GESCHWAERMT');
CREATE TYPE "KoeniginEreignisArt" AS ENUM ('GESCHLUEPFT', 'ZUR_BELEGSTELLE', 'VON_BELEGSTELLE', 'ZUGESETZT', 'IN_ABLEGER', 'ENTNOMMEN', 'VERKAUFT', 'VERSTORBEN', 'GESCHWAERMT', 'SONSTIGES');

CREATE TABLE "Belegstelle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ort" TEXT,
    "rasse" TEXT,
    "linie" TEXT,
    "notizen" TEXT,
    "archiviert" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Belegstelle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Koenigin" (
    "id" TEXT NOT NULL,
    "kennung" TEXT NOT NULL,
    "zuchtbuchnummer" TEXT,
    "rasse" TEXT,
    "jahrgang" INTEGER,
    "schlupfDatum" TIMESTAMP(3),
    "zeichenFarbe" TEXT,
    "zeichenNummer" TEXT,
    "herkunft" "KoeniginHerkunft" NOT NULL DEFAULT 'UNBEKANNT',
    "herkunftText" TEXT,
    "herkunftsVolkId" TEXT,
    "begattungsart" "Begattungsart" NOT NULL DEFAULT 'UNBEKANNT',
    "belegstelleId" TEXT,
    "begattungsStandId" TEXT,
    "begattungVon" TIMESTAMP(3),
    "begattungBis" TIMESTAMP(3),
    "vaterlinie" TEXT,
    "mutterKoeniginId" TEXT,
    "zuchtkarteFotoDateiname" TEXT,
    "zuchtkarteFotoOriginalDateiname" TEXT,
    "zuchtkarteFotoMimeType" TEXT,
    "status" "KoeniginStatus" NOT NULL DEFAULT 'IM_VOLK',
    "notizen" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Koenigin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KoeniginEreignis" (
    "id" TEXT NOT NULL,
    "koeniginId" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "art" "KoeniginEreignisArt" NOT NULL,
    "volkId" TEXT,
    "notiz" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KoeniginEreignis_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Koenigin_mutterKoeniginId_idx" ON "Koenigin"("mutterKoeniginId");
CREATE INDEX "KoeniginEreignis_koeniginId_datum_idx" ON "KoeniginEreignis"("koeniginId", "datum");

ALTER TABLE "Volk" ADD COLUMN "koeniginId" TEXT;
CREATE UNIQUE INDEX "Volk_koeniginId_key" ON "Volk"("koeniginId");

ALTER TABLE "Koenigin" ADD CONSTRAINT "Koenigin_herkunftsVolkId_fkey" FOREIGN KEY ("herkunftsVolkId") REFERENCES "Volk"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Koenigin" ADD CONSTRAINT "Koenigin_belegstelleId_fkey" FOREIGN KEY ("belegstelleId") REFERENCES "Belegstelle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Koenigin" ADD CONSTRAINT "Koenigin_begattungsStandId_fkey" FOREIGN KEY ("begattungsStandId") REFERENCES "Bienenstand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Koenigin" ADD CONSTRAINT "Koenigin_mutterKoeniginId_fkey" FOREIGN KEY ("mutterKoeniginId") REFERENCES "Koenigin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KoeniginEreignis" ADD CONSTRAINT "KoeniginEreignis_koeniginId_fkey" FOREIGN KEY ("koeniginId") REFERENCES "Koenigin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KoeniginEreignis" ADD CONSTRAINT "KoeniginEreignis_volkId_fkey" FOREIGN KEY ("volkId") REFERENCES "Volk"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Volk" ADD CONSTRAINT "Volk_koeniginId_fkey" FOREIGN KEY ("koeniginId") REFERENCES "Koenigin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Bestehende Angaben übernehmen: für jedes Volk, an dem Jahrgang oder Zeichen
-- steht, entsteht eine Königin mit genau diesen Angaben. Kennung fortlaufend
-- je Jahrgang ("K 2024-01"), Herkunft/Begattung bleiben unbekannt - das war
-- vorher auch nicht erfasst und soll nicht erfunden werden.
INSERT INTO "Koenigin" ("id", "kennung", "rasse", "jahrgang", "zeichenFarbe", "status", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    'K ' || COALESCE("koeniginJahr"::text, 'ohne Jahr') || '-' ||
        LPAD(ROW_NUMBER() OVER (PARTITION BY "koeniginJahr" ORDER BY "name")::text, 2, '0'),
    "rasse",
    "koeniginJahr",
    "koeniginZeichen",
    'IM_VOLK',
    NOW(),
    NOW()
FROM "Volk"
WHERE "koeniginJahr" IS NOT NULL OR "koeniginZeichen" IS NOT NULL;

-- Und jeweils dem Volk zuordnen, aus dem sie stammt. Die Zuordnung läuft über
-- dieselbe Reihenfolge wie oben, damit Jahrgang/Zeichen beim richtigen Volk
-- landen.
WITH nummeriert AS (
    SELECT
        "id" AS volk_id,
        'K ' || COALESCE("koeniginJahr"::text, 'ohne Jahr') || '-' ||
            LPAD(ROW_NUMBER() OVER (PARTITION BY "koeniginJahr" ORDER BY "name")::text, 2, '0') AS kennung
    FROM "Volk"
    WHERE "koeniginJahr" IS NOT NULL OR "koeniginZeichen" IS NOT NULL
)
UPDATE "Volk" v
SET "koeniginId" = k."id"
FROM nummeriert n
JOIN "Koenigin" k ON k."kennung" = n.kennung
WHERE v."id" = n.volk_id;

ALTER TABLE "Volk" DROP COLUMN "koeniginJahr";
ALTER TABLE "Volk" DROP COLUMN "koeniginZeichen";
