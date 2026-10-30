-- CreateEnum
CREATE TYPE "Wiegemethode" AS ENUM ('EINSEITIG', 'VOLLSTAENDIG');

-- AlterTable
ALTER TABLE "StockkartenEintrag" ADD COLUMN "wiegemethode" "Wiegemethode";
