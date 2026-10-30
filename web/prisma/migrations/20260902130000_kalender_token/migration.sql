-- Geheime Kennung für die Adresse des Kalender-Feeds. Kalender-Apps können
-- sich nicht wie ein Browser anmelden, deshalb steckt die Berechtigung in der
-- Adresse selbst - und lässt sich durch Neuerzeugen wieder entziehen.

-- AlterTable
ALTER TABLE "Betrieb" ADD COLUMN "kalenderToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Betrieb_kalenderToken_key" ON "Betrieb"("kalenderToken");
