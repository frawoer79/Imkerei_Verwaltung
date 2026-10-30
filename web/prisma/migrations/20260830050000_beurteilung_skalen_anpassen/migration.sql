-- Reine Daten-Migration, keine Schema-Änderung: Sanftmut und Wabensitz
-- wurden in der Anwendung von "gut zuerst" auf "kritisch zuerst" gedreht
-- (gleiche Bedeutung, umgekehrte Zahlenwerte auf der 4er-Skala), Schwarmtrieb
-- hat eine neue Stufe "Kein Schwarmtrieb" am Anfang bekommen (Skala von 4 auf
-- 5 Stufen). Bestehende Werte werden so verschoben, dass sie weiterhin
-- dasselbe bedeuten wie vorher.

UPDATE "StockkartenEintrag" SET "sanftmut" = 5 - "sanftmut" WHERE "sanftmut" IS NOT NULL;
UPDATE "StockkartenEintrag" SET "wabensitz" = 5 - "wabensitz" WHERE "wabensitz" IS NOT NULL;
UPDATE "StockkartenEintrag" SET "schwarmtrieb" = "schwarmtrieb" + 1 WHERE "schwarmtrieb" IS NOT NULL;
