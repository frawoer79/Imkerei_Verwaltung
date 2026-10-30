-- Ein einzelnes Foto der Beute selbst, direkt am Volk statt an einem
-- Stockkarten-Eintrag - für den schnellen Wiedererkennungswert am Stand.
-- Bewusst denormalisiert (kein eigenes Bild-Modell): es soll nur genau eins
-- geben, keine Galerie.

ALTER TABLE "Volk" ADD COLUMN "beuteFotoDateiname" TEXT;
ALTER TABLE "Volk" ADD COLUMN "beuteFotoOriginalDateiname" TEXT;
ALTER TABLE "Volk" ADD COLUMN "beuteFotoMimeType" TEXT;
