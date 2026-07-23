-- AlterEnum: SUPER_ADMIN
DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable AuditLog (nullable userId + forensic payloads)
ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "oldData" JSONB;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "newData" JSONB;

-- CreateTable SystemBackup
CREATE TABLE IF NOT EXISTS "SystemBackup" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemBackup_pkey" PRIMARY KEY ("id")
);
