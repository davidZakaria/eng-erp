-- CreateEnum
CREATE TYPE "TrackerStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "PourTrackerEntry" (
    "id" TEXT NOT NULL,
    "buildingLabel" TEXT NOT NULL,
    "halfZone" TEXT,
    "floorLevel" TEXT,
    "elementType" TEXT NOT NULL,
    "elementLabel" TEXT,
    "rebarByDiameter" JSONB NOT NULL DEFAULT '{}',
    "concreteM3" DOUBLE PRECISION,
    "rebarCostEGP" DOUBLE PRECISION,
    "concreteCostEGP" DOUBLE PRECISION,
    "laborCostEGP" DOUBLE PRECISION,
    "plannedDurationDays" INTEGER,
    "plannedStart" TIMESTAMP(3),
    "plannedEnd" TIMESTAMP(3),
    "actualPourDate" TIMESTAMP(3),
    "status" "TrackerStatus" NOT NULL DEFAULT 'PLANNED',
    "sourceRow" INTEGER,
    "notes" TEXT,
    "loggedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PourTrackerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulePlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectLabel" TEXT,
    "planDeadline" TIMESTAMP(3),
    "buildingCodes" TEXT[],
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleLine" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "parentCode" TEXT,
    "description" TEXT NOT NULL,
    "unit" TEXT,
    "categoryLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ScheduleLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleBuildingProgress" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "buildingCode" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "rateEGP" DOUBLE PRECISION,
    "durationDays" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "lineTotalEGP" DOUBLE PRECISION,
    "status" TEXT,

    CONSTRAINT "ScheduleBuildingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PourTrackerEntry_buildingLabel_floorLevel_idx" ON "PourTrackerEntry"("buildingLabel", "floorLevel");

-- CreateIndex
CREATE INDEX "ScheduleLine_planId_sortOrder_idx" ON "ScheduleLine"("planId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleBuildingProgress_lineId_buildingCode_key" ON "ScheduleBuildingProgress"("lineId", "buildingCode");

-- AddForeignKey
ALTER TABLE "PourTrackerEntry" ADD CONSTRAINT "PourTrackerEntry_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleLine" ADD CONSTRAINT "ScheduleLine_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SchedulePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleBuildingProgress" ADD CONSTRAINT "ScheduleBuildingProgress_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ScheduleLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
