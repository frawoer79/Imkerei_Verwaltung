-- Weitere übliche Honig-Gebinde vorgeben: DIB-Probierglas 30 g, Glas 50 g
-- und Eimer 2,5 kg. Wie bei 20261014200000_honig_gebinde: nur für Honig,
-- und eine schon vorhandene Füllmenge wird nicht doppelt angelegt.
INSERT INTO "Gebinde" (id, "erzeugnistypId", name, inhalt, "createdAt")
SELECT gen_random_uuid()::text, et.id, v.name, v.inhalt, now()
FROM "Erzeugnistyp" et
CROSS JOIN (VALUES
    ('Eimer 2,5 kg', 2.5),
    ('Glas 50 g', 0.05),
    ('Glas 30 g', 0.03)
) AS v(name, inhalt)
WHERE et.name = 'Honig'
  AND et.einheit = 'kg'
  AND NOT EXISTS (
    SELECT 1 FROM "Gebinde" g
    WHERE g."erzeugnistypId" = et.id AND g.inhalt = v.inhalt
  );
