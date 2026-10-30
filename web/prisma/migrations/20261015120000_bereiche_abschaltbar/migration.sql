-- CreateTable
CREATE TABLE "Bereichswahl" (
    "id" TEXT NOT NULL DEFAULT 'standard',
    "abgeschaltet" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bereichswahl_pkey" PRIMARY KEY ("id")
);
