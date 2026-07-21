-- CreateEnum
CREATE TYPE "Discipline" AS ENUM ('ARCHITECTURAL', 'STRUCTURAL', 'MEP', 'INFRASTRUCTURE');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'REVISION_REQUESTED', 'APPROVED_FOR_CONSTRUCTION', 'DEVIATION_PENDING_OWNER', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "PanelPhase" AS ENUM ('R', 'Y', 'B');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'ADMIN';
ALTER TYPE "Role" ADD VALUE 'ARCH_CONSULTANT';
ALTER TYPE "Role" ADD VALUE 'STRUCT_CONSULTANT';
ALTER TYPE "Role" ADD VALUE 'MEP_CONSULTANT';

-- CreateTable
CREATE TABLE "CSIDivision" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "CSIDivision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovedVendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "divisionId" TEXT NOT NULL,

    CONSTRAINT "ApprovedVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Drawing" (
    "id" TEXT NOT NULL,
    "drawingNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "status" "ItemStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "fileUrl" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Drawing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PourClearance" (
    "id" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "floorLevel" TEXT NOT NULL,
    "formworkApproved" BOOLEAN NOT NULL DEFAULT false,
    "rebarApproved" BOOLEAN NOT NULL DEFAULT false,
    "ptCablesXApproved" BOOLEAN NOT NULL DEFAULT false,
    "ptCablesYApproved" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PourClearance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialSubmittal" (
    "id" TEXT NOT NULL,
    "equipmentTag" TEXT NOT NULL,
    "proposedVendor" TEXT NOT NULL,
    "isApprovedVendor" BOOLEAN NOT NULL,
    "equivalenceLetterUrl" TEXT,
    "status" "ItemStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "divisionId" TEXT NOT NULL,
    "vendorId" TEXT,

    CONSTRAINT "MaterialSubmittal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectricalPanel" (
    "id" TEXT NOT NULL,
    "panelReference" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "incomingCB" TEXT NOT NULL,
    "isUnbalanced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ElectricalPanel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PanelCircuit" (
    "id" TEXT NOT NULL,
    "circuitNumber" INTEGER NOT NULL,
    "mcbRating" DOUBLE PRECISION NOT NULL,
    "wireSize" TEXT NOT NULL,
    "loadType" TEXT NOT NULL,
    "connectedLoadVA" DOUBLE PRECISION NOT NULL,
    "demandFactor" DOUBLE PRECISION NOT NULL,
    "phase" "PanelPhase" NOT NULL,
    "panelId" TEXT NOT NULL,

    CONSTRAINT "PanelCircuit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CSIDivision_code_key" ON "CSIDivision"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Drawing_drawingNumber_revision_key" ON "Drawing"("drawingNumber", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "ElectricalPanel_panelReference_key" ON "ElectricalPanel"("panelReference");

-- AddForeignKey
ALTER TABLE "ApprovedVendor" ADD CONSTRAINT "ApprovedVendor_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "CSIDivision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drawing" ADD CONSTRAINT "Drawing_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialSubmittal" ADD CONSTRAINT "MaterialSubmittal_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "CSIDivision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialSubmittal" ADD CONSTRAINT "MaterialSubmittal_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "ApprovedVendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelCircuit" ADD CONSTRAINT "PanelCircuit_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "ElectricalPanel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
