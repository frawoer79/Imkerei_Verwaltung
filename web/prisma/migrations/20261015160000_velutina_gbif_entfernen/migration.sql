-- Erweiterung auf ganz Deutschland (PR #57) zurückgenommen: GBIF-Meldungen
-- und ihr Abrufstand werden entfernt, damit Karte und LUBW-Abgleich wieder
-- nur Baden-Württemberg sehen. Die Spalten bleiben, sie stören nicht.
DELETE FROM "VelutinaMeldung" WHERE "quelle" <> 'LUBW';
DELETE FROM "VelutinaAbruf" WHERE "id" <> 'standard';
