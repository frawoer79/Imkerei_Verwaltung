-- AlterTable
ALTER TABLE "Bienenstand" ADD COLUMN     "standortFotoDateiname" TEXT,
ADD COLUMN     "standortFotoFokusX" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN     "standortFotoFokusY" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN     "standortFotoMimeType" TEXT,
ADD COLUMN     "standortFotoOriginalDateiname" TEXT,
ADD COLUMN     "standortFotoZoom" DOUBLE PRECISION NOT NULL DEFAULT 1;
