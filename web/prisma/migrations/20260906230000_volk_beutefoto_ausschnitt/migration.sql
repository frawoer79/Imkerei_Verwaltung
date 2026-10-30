-- Von Hand wählbarer Bildausschnitt des Beutenfotos für die Anzeige als
-- Hintergrund (Kachel/Kopfbereich). Zoom 1 = Bild deckt die Fläche gerade so
-- ab ("Grenze des Bildes erreicht"), Fokuspunkt als Bruchteil der
-- Bildbreite/-höhe (0-1). Bestehende Fotos bleiben unverändert zentriert.

ALTER TABLE "Volk" ADD COLUMN "beuteFotoZoom" DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE "Volk" ADD COLUMN "beuteFotoFokusX" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
ALTER TABLE "Volk" ADD COLUMN "beuteFotoFokusY" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
