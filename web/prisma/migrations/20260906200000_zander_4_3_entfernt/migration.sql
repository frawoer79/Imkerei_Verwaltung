-- "4/3 (Brutraum)" bei Zander ist zu selten, um im Katalog zu bleiben (Frank:
-- "das ist so selten das ich es nichtmal kenne"). Aus dem Katalog entfernt
-- (beutensysteme.ts) und hier aus schon per Selbstheilung angelegten
-- Zander-Systemen wieder herausgenommen.
--
-- Zarge cascadet über den Wabenmass-Fremdschlüssel automatisch mit; eine
-- bereits erfasste Ernte oder ein aufgesetzter Honigraum bliebe über die dort
-- gespeicherte Kopie (Bezeichnung, Gewicht) trotzdem lesbar - so unwahr-
-- scheinlich das bei einem gerade erst ergänzten, unbekannten Maß ist.

DELETE FROM "Wabenmass" WHERE name = '4/3 (Brutraum)';
