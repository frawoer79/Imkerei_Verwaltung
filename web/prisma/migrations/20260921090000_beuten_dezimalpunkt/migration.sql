-- Das Komma als Dezimaltrenner in Rähmchenmaß-Namen ("1,5") kollidierte mit
-- dem Komma, das die Zargen-Anzeige selbst als Trennzeichen benutzt (z.B.
-- "Zander 1,5, 10 Waben" - liest sich wie drei Zahlen). Ab jetzt Punkt statt
-- Komma, siehe web/src/lib/beutensysteme.ts. Wabenmass.name und Zarge.name
-- sind zwei getrennte Kopien (Zarge.name wird beim Anlegen einmalig aus dem
-- Wabenmass übernommen, siehe web/src/lib/beuten.ts), darum beide anpassen.
-- Frei benannte Systeme sind über den Bezug auf "Zander"/"Deutsch Normalmaß"
-- ausgeschlossen - nur die beiden bekannten Katalog-Fälle werden umbenannt.

UPDATE "Wabenmass" AS w
SET name = '1.5'
FROM "Beutensystem" AS b
WHERE w."beutensystemId" = b.id
  AND b.name = 'Zander'
  AND w.name = '1,5';

UPDATE "Zarge" AS z
SET name = '1.5'
FROM "Wabenmass" AS w
JOIN "Beutensystem" AS b ON w."beutensystemId" = b.id
WHERE z."wabenmassId" = w.id
  AND b.name = 'Zander'
  AND z.name = '1,5';

UPDATE "Wabenmass" AS w
SET name = 'anderthalb (1.5)'
FROM "Beutensystem" AS b
WHERE w."beutensystemId" = b.id
  AND b.name = 'Deutsch Normalmaß'
  AND w.name = 'anderthalb (1,5)';

UPDATE "Zarge" AS z
SET name = 'anderthalb (1.5)'
FROM "Wabenmass" AS w
JOIN "Beutensystem" AS b ON w."beutensystemId" = b.id
WHERE z."wabenmassId" = w.id
  AND b.name = 'Deutsch Normalmaß'
  AND z.name = 'anderthalb (1,5)';
