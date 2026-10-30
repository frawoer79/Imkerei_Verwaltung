/*
  Die Blende kommt beim Volk zurück: im Kopfbereich der Volk-Seite liegen
  Name und Text wieder direkt über dem Foto, dort hält der seitliche Verlauf
  sie lesbar. Beim Bienenstand bleibt sie entfernt - dessen Kopf ist ein
  Banner mit eigenem dunklen Verlauf von unten, der braucht sie nicht.

  Beide Spalten starten auf ihren Vorgabewerten. Zuvor eingestellte Werte sind
  mit der vorherigen Migration gelöscht worden und lassen sich nicht
  zurückholen - sie müssen im Ausschnitt-Editor neu eingestellt werden.
*/
-- AlterTable
ALTER TABLE "Volk" ADD COLUMN     "beuteFotoBlendeBreite" DOUBLE PRECISION NOT NULL DEFAULT 0.55,
ADD COLUMN     "beuteFotoBlendePosition" DOUBLE PRECISION NOT NULL DEFAULT 0.15;
