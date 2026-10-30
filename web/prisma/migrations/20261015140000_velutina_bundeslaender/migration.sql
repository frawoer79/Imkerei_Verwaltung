-- Velutina-Meldungen aus ganz Deutschland: Quelle und Bundesland je Meldung.
-- Alle vorhandenen Meldungen stammen von der LUBW (Baden-Württemberg).
ALTER TABLE "VelutinaMeldung" ADD COLUMN "quelle" TEXT NOT NULL DEFAULT 'LUBW',
ADD COLUMN "bundesland" TEXT NOT NULL DEFAULT 'BW',
ADD COLUMN "herkunft" TEXT,
ADD COLUMN "link" TEXT;

CREATE INDEX "VelutinaMeldung_quelle_idx" ON "VelutinaMeldung"("quelle");

-- Je Konto die eingeschalteten Bundesländer, bisher war nur BW abgedeckt.
ALTER TABLE "VelutinaEinstellung" ADD COLUMN "bundeslaender" TEXT[] DEFAULT ARRAY['BW']::TEXT[];
