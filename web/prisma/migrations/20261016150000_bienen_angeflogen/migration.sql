-- Neuer Haken in der Beurteilung: Bienen haben den Imker angeflogen.
ALTER TABLE "StockkartenEintrag" ADD COLUMN "bienenAngeflogen" BOOLEAN;
