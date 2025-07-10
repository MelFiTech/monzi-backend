-- AlterTable
ALTER TABLE "webhook_logs" ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "processedAt" DROP NOT NULL,
ALTER COLUMN "processedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "webhook_logs_contentHash_idx" ON "webhook_logs"("contentHash");
