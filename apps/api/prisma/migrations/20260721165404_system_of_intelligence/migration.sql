-- AlterTable
ALTER TABLE "MaterialSubmittal" ADD COLUMN     "costDeltaEGP" DOUBLE PRECISION,
ADD COLUMN     "leadTimeWeeks" INTEGER,
ADD COLUMN     "systemRecommendation" TEXT;

-- AlterTable
ALTER TABLE "PourClearance" ADD COLUMN     "isLockedByMEP" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLockedByNCR" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "NonConformanceReport" (
    "id" TEXT NOT NULL,
    "ncrNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "floorLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NonConformanceReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NonConformanceReport_ncrNumber_key" ON "NonConformanceReport"("ncrNumber");
