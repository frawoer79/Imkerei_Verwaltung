-- Bildausschnitt fürs Foto der Königin - damit beim Einfügen der sichtbare
-- Teil gewählt werden kann, statt dass der Rahmen automatisch die Mitte
-- nimmt. Gleiches Verfahren wie beim Beutenfoto.

ALTER TABLE "Koenigin" ADD COLUMN "fotoZoom" DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE "Koenigin" ADD COLUMN "fotoFokusX" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
ALTER TABLE "Koenigin" ADD COLUMN "fotoFokusY" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
