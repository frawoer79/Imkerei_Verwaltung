-- Gängige Honig-Gebinde vorgeben (Franks Größen), damit beim Buchen von
-- Honig gleich die Gebinde-Auswahl erscheint: Anzahl eingeben, die
-- Kilogramm rechnet die App aus. Ein Gebinde mit gleicher Füllmenge, das
-- schon von Hand angelegt wurde, wird nicht doppelt angelegt. Läuft auch
-- für die Testzugänge (eigene Schemas, dieselben Migrationen).
INSERT INTO "Gebinde" (id, "erzeugnistypId", name, inhalt, "createdAt")
SELECT gen_random_uuid()::text, et.id, v.name, v.inhalt, now()
FROM "Erzeugnistyp" et
CROSS JOIN (VALUES
    ('Hobbock 40 kg', 40.0),
    ('Eimer 25 kg', 25.0),
    ('Eimer 12,5 kg', 12.5),
    ('Glas 500 g', 0.5),
    ('Glas 250 g', 0.25),
    ('Glas 125 g', 0.125)
) AS v(name, inhalt)
WHERE et.name = 'Honig'
  AND et.einheit = 'kg'
  AND NOT EXISTS (
    SELECT 1 FROM "Gebinde" g
    WHERE g."erzeugnistypId" = et.id AND g.inhalt = v.inhalt
  );
