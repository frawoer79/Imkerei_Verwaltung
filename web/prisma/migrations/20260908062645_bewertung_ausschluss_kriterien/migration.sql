-- AlterTable
ALTER TABLE "StockkartenEintrag" ADD COLUMN     "ausschlussKriterien" TEXT[] DEFAULT ARRAY[]::TEXT[];
