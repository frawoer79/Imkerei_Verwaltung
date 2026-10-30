-- Beurteilung des Volkes: statt 5 bzw. 6 Stufen (1 = schlechteste) jetzt
-- Noten von 1,0 (beste Stufe) bis 6,0 in halben Schritten.
-- Umrechnung der vorhandenen Werte (entspricht der bisherigen Umrechnung in
-- Schulnoten, auf halbe Noten gerundet):
--   5 Stufen, 1 = schlechteste: 1 -> 6,0 | 2 -> 5,0 | 3 -> 3,5 | 4 -> 2,0 | 5 -> 1,0
--   Schwarmtrieb (1 = kein Schwarmtrieb): 1 -> 1,0 | 2 -> 2,0 | 3 -> 3,5 | 4 -> 5,0 | 5 -> 6,0
--   6 Stufen (Legeleistung, Gesamteindruck), 1 = schlechteste: Note = 7 - Stufe

ALTER TABLE "StockkartenEintrag"
  ALTER COLUMN "volksstaerkeEinschaetzung" TYPE DOUBLE PRECISION USING (
    CASE "volksstaerkeEinschaetzung" WHEN 1 THEN 6.0 WHEN 2 THEN 5.0 WHEN 3 THEN 3.5 WHEN 4 THEN 2.0 WHEN 5 THEN 1.0 END),
  ALTER COLUMN "futtermengeEinschaetzung" TYPE DOUBLE PRECISION USING (
    CASE "futtermengeEinschaetzung" WHEN 1 THEN 6.0 WHEN 2 THEN 5.0 WHEN 3 THEN 3.5 WHEN 4 THEN 2.0 WHEN 5 THEN 1.0 END),
  ALTER COLUMN "sanftmut" TYPE DOUBLE PRECISION USING (
    CASE "sanftmut" WHEN 1 THEN 6.0 WHEN 2 THEN 5.0 WHEN 3 THEN 3.5 WHEN 4 THEN 2.0 WHEN 5 THEN 1.0 END),
  ALTER COLUMN "wabensitz" TYPE DOUBLE PRECISION USING (
    CASE "wabensitz" WHEN 1 THEN 6.0 WHEN 2 THEN 5.0 WHEN 3 THEN 3.5 WHEN 4 THEN 2.0 WHEN 5 THEN 1.0 END),
  ALTER COLUMN "schwarmtrieb" TYPE DOUBLE PRECISION USING (
    CASE "schwarmtrieb" WHEN 1 THEN 1.0 WHEN 2 THEN 2.0 WHEN 3 THEN 3.5 WHEN 4 THEN 5.0 WHEN 5 THEN 6.0 END),
  ALTER COLUMN "legeleistung" TYPE DOUBLE PRECISION USING (
    CASE WHEN "legeleistung" BETWEEN 1 AND 6 THEN 7 - "legeleistung" END),
  ALTER COLUMN "gesamteindruck" TYPE DOUBLE PRECISION USING (
    CASE WHEN "gesamteindruck" BETWEEN 1 AND 6 THEN 7 - "gesamteindruck" END),
  ADD COLUMN "abgeschwaermt" BOOLEAN,
  ADD COLUMN "drohnenbruetig" BOOLEAN;
