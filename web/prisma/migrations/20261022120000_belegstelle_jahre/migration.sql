-- Drohnenvölker der Belegstellen je Jahr statt eines einzigen Feldes "linie".

-- CreateTable
CREATE TABLE "BelegstelleJahr" (
    "id" TEXT NOT NULL,
    "belegstelleId" TEXT NOT NULL,
    "jahr" INTEGER NOT NULL,
    "drohnenvoelker" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BelegstelleJahr_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BelegstelleJahr_belegstelleId_jahr_key" ON "BelegstelleJahr"("belegstelleId", "jahr");

-- AddForeignKey
ALTER TABLE "BelegstelleJahr" ADD CONSTRAINT "BelegstelleJahr_belegstelleId_fkey" FOREIGN KEY ("belegstelleId") REFERENCES "Belegstelle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bisherige Drohnenlinie übernehmen. Als Jahr gilt das jüngste Belegjahr der
-- Königinnen dieser Belegstelle (Begattung, sonst Jahrgang), ohne Königinnen
-- das Jahr der letzten Änderung. Lässt sich danach in der App korrigieren.
INSERT INTO "BelegstelleJahr" ("id", "belegstelleId", "jahr", "drohnenvoelker", "updatedAt")
SELECT
    'mig' || md5(b."id"),
    b."id",
    COALESCE(
        (SELECT MAX(COALESCE(EXTRACT(YEAR FROM k."begattungVon")::INTEGER, k."jahrgang"))
           FROM "Koenigin" k WHERE k."belegstelleId" = b."id"),
        EXTRACT(YEAR FROM b."updatedAt")::INTEGER
    ),
    b."linie",
    CURRENT_TIMESTAMP
FROM "Belegstelle" b
WHERE b."linie" IS NOT NULL AND btrim(b."linie") <> '';

-- AlterTable
ALTER TABLE "Belegstelle" DROP COLUMN "linie";
