-- Velutina: alles, was beim ersten Abruf schon da war, gilt als Altbestand
-- (keine Warnung, keine Mail) - gewarnt wird nur bei später neu
-- hinzukommenden Meldungen. Betrifft nur die Tabelle der LUBW-Meldungen,
-- die jederzeit neu abgerufen werden kann.
UPDATE "VelutinaMeldung" SET "erstmalsAbgerufenAm" = '2000-01-01 00:00:00';
