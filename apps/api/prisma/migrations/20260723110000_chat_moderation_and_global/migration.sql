-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "isGlobal" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ChatModeration" (
    "userId" TEXT NOT NULL,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "bannedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatModeration_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_isGlobal_unique" ON "Conversation"("isGlobal") WHERE "isGlobal" = true;

-- AddForeignKey
ALTER TABLE "ChatModeration" ADD CONSTRAINT "ChatModeration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
