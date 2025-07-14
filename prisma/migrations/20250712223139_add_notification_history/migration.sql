-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TRANSACTION', 'WALLET_FUNDING', 'WALLET_DEBIT', 'TRANSFER', 'WITHDRAWAL', 'PROMOTIONAL', 'SYSTEM', 'SECURITY', 'KYC', 'GENERAL');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'WEBSOCKET', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "notification_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "pushToken" TEXT,
    "reference" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_history_userId_idx" ON "notification_history"("userId");

-- CreateIndex
CREATE INDEX "notification_history_type_idx" ON "notification_history"("type");

-- CreateIndex
CREATE INDEX "notification_history_status_idx" ON "notification_history"("status");

-- CreateIndex
CREATE INDEX "notification_history_createdAt_idx" ON "notification_history"("createdAt");

-- AddForeignKey
ALTER TABLE "notification_history" ADD CONSTRAINT "notification_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
