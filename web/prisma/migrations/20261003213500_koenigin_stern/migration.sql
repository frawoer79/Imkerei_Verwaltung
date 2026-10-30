-- Stern für herausragende Königinnen. Fügt nur eine neue Spalte hinzu, alle
-- vorhandenen Königinnen bekommen den Standardwert false (kein Stern).

-- AlterTable
ALTER TABLE "Koenigin" ADD COLUMN "stern" BOOLEAN NOT NULL DEFAULT false;
