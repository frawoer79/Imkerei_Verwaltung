-- CreateEnum
CREATE TYPE "VoelkerSortierung" AS ENUM ('CHRONOLOGISCH', 'STANDPOSITION');

-- AlterTable
ALTER TABLE "Bienenstand" ADD COLUMN     "voelkerSortierung" "VoelkerSortierung" NOT NULL DEFAULT 'CHRONOLOGISCH';

-- AlterTable
ALTER TABLE "Volk" ADD COLUMN     "standReihenfolge" INTEGER;
