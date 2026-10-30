-- Varroa-Befallsgrad ausrechenbar machen: die Gemülldiagnose braucht die
-- Anzahl der Tage, die die Bodeneinlage unter dem Volk lag (daraus ergibt sich
-- der Milbenfall pro Tag), die Bienenproben-Methoden brauchen das Gewicht der
-- Probe (50 g = ca. 500 Bienen, daraus ergibt sich der Befall in Prozent).
-- Dazu kommt die Auswaschmethode als weitere Zählweise.

-- AlterEnum
ALTER TYPE "VarroaZaehlweise" ADD VALUE 'AUSWASCHUNG';

-- AlterTable
ALTER TABLE "StockkartenEintrag" ADD COLUMN "varroaGemuellTage" INTEGER;
ALTER TABLE "StockkartenEintrag" ADD COLUMN "varroaBienenprobeGramm" INTEGER;
