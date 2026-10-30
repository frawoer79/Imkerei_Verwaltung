-- Nestsuche archivieren: abgeschlossene Suchen bleiben zum Nachlesen erhalten.
ALTER TABLE "VelutinaNestsuche" ADD COLUMN "archiviertAm" TIMESTAMP(3);
