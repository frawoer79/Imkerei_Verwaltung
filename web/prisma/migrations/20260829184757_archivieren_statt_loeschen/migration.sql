-- AlterTable
ALTER TABLE "Bienenstand" ADD COLUMN     "archiviert" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archiviertAm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Volk" ADD COLUMN     "archiviert" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archiviertAm" TIMESTAMP(3);
