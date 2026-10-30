-- Reine Daten-Migration, keine Schema-Änderung: Volksstärke, Futtermenge und
-- Sanftmut haben eine neue kritischere Stufe am Anfang bekommen (4 -> 5
-- Stufen: "Sehr schwach"/"Sehr wenig"/"Aggressiv"), damit der bisher
-- zweitkritischste (gelb markierte) Wert "Normal"/"Ausreichend" jetzt sicher
-- im neutralen/grünen Bereich landet. Bestehende Werte werden um eins nach
-- hinten verschoben, damit sie weiterhin dasselbe bedeuten wie vorher.
-- Wabensitz hat die neue Stufe am guten Ende bekommen ("Sehr ruhig") -
-- bestehende Werte behalten dort unverändert ihre Bedeutung.

UPDATE "StockkartenEintrag" SET "volksstaerkeEinschaetzung" = "volksstaerkeEinschaetzung" + 1 WHERE "volksstaerkeEinschaetzung" IS NOT NULL;
UPDATE "StockkartenEintrag" SET "futtermengeEinschaetzung" = "futtermengeEinschaetzung" + 1 WHERE "futtermengeEinschaetzung" IS NOT NULL;
UPDATE "StockkartenEintrag" SET "sanftmut" = "sanftmut" + 1 WHERE "sanftmut" IS NOT NULL;
