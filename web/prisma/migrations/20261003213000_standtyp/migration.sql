-- CreateEnum
CREATE TYPE "Standtyp" AS ENUM ('FEST', 'WANDER');

-- AlterTable
ALTER TABLE "Bienenstand" ADD COLUMN     "standtyp" "Standtyp" NOT NULL DEFAULT 'FEST';
