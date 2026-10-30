/*
  Die Blende (der seitliche Verlauf über dem Foto) entfällt ersatzlos: Name und
  Text liegen nicht mehr direkt auf dem Foto, sondern unter dem Kopfbanner bzw.
  neben dem Vorschaubild - ein Verlauf, der sie lesbar halten müsste, hat damit
  keine Aufgabe mehr. Die vier Spalten dazu werden entfernt.

  Einstellbar bleibt allein der Bildausschnitt (Zoom + Fokuspunkt). Dessen
  Bedeutung ändert sich dabei: das Foto füllt den Rahmen jetzt randlos
  (object-cover statt object-contain), dadurch ist der Ausgangspunkt die
  Bildmitte statt des rechten Rands. Die Vorgabe für FokusX wechselt darum von
  1 auf 0.5, und alle Fotos, die noch auf dem alten Vorgabewert 1 stehen (also
  nie von Hand verschoben wurden), werden mittig gesetzt. Von Hand gewählte
  Werte bleiben unangetastet.
*/
-- AlterTable
ALTER TABLE "Bienenstand" DROP COLUMN "standortFotoBlendeBreite",
DROP COLUMN "standortFotoBlendePosition",
ALTER COLUMN "standortFotoFokusX" SET DEFAULT 0.5;

-- AlterTable
ALTER TABLE "Volk" DROP COLUMN "beuteFotoBlendeBreite",
DROP COLUMN "beuteFotoBlendePosition",
ALTER COLUMN "beuteFotoFokusX" SET DEFAULT 0.5;

-- Nie von Hand verschobene Fotos auf die neue Bildmitte setzen.
UPDATE "Bienenstand" SET "standortFotoFokusX" = 0.5 WHERE "standortFotoFokusX" = 1;
UPDATE "Volk" SET "beuteFotoFokusX" = 0.5 WHERE "beuteFotoFokusX" = 1;
