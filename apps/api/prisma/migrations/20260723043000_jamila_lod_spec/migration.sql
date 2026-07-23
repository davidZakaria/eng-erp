-- AlterTable
ALTER TABLE "ApprovedVendor" ADD COLUMN "disciplineTag" TEXT;

-- AlterTable
ALTER TABLE "BOQItem" ADD COLUMN "divisionCode" TEXT;

-- AlterTable
ALTER TABLE "Drawing" ADD COLUMN "projectNumber" TEXT,
ADD COLUMN "disciplineCode" TEXT,
ADD COLUMN "sheetNumber" TEXT,
ADD COLUMN "sheetSize" TEXT,
ADD COLUMN "scale" TEXT,
ADD COLUMN "packageName" TEXT;

-- AlterTable
ALTER TABLE "MaterialSubmittal" ADD COLUMN "specSectionId" TEXT;

-- CreateTable
CREATE TABLE "SpecSection" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "divisionCode" TEXT NOT NULL,
    "fileUrl" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpecSection_code_key" ON "SpecSection"("code");

-- AddForeignKey
ALTER TABLE "MaterialSubmittal" ADD CONSTRAINT "MaterialSubmittal_specSectionId_fkey" FOREIGN KEY ("specSectionId") REFERENCES "SpecSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
