-- CreateEnum
CREATE TYPE "AuditorMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditorReportType" AS ENUM ('FINANCIAL_ANALYSIS', 'RISK_ASSESSMENT', 'COMPLIANCE_AUDIT', 'SYSTEM_HEALTH', 'FRAUD_DETECTION');

-- CreateEnum
CREATE TYPE "AuditorRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "auditor_configurations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "model" TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 8000,
    "systemPrompt" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "encryptionKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auditor_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditor_chats" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "configId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auditor_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditor_messages" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "role" "AuditorMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "tokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditor_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditor_reports" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "type" "AuditorReportType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "riskLevel" "AuditorRiskLevel" NOT NULL DEFAULT 'LOW',
    "findings" JSONB,
    "recommendations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auditor_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditor_metrics" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "totalTransactions" INTEGER NOT NULL DEFAULT 0,
    "totalVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageTransaction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "failureRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fraudAlerts" INTEGER NOT NULL DEFAULT 0,
    "systemHealth" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auditor_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auditor_chats_sessionId_key" ON "auditor_chats"("sessionId");

-- CreateIndex
CREATE INDEX "auditor_chats_sessionId_idx" ON "auditor_chats"("sessionId");

-- CreateIndex
CREATE INDEX "auditor_chats_adminUserId_idx" ON "auditor_chats"("adminUserId");

-- CreateIndex
CREATE INDEX "auditor_messages_chatId_idx" ON "auditor_messages"("chatId");

-- CreateIndex
CREATE INDEX "auditor_reports_chatId_idx" ON "auditor_reports"("chatId");

-- CreateIndex
CREATE INDEX "auditor_reports_type_idx" ON "auditor_reports"("type");

-- CreateIndex
CREATE INDEX "auditor_reports_riskLevel_idx" ON "auditor_reports"("riskLevel");

-- CreateIndex
CREATE INDEX "auditor_metrics_periodType_idx" ON "auditor_metrics"("periodType");

-- CreateIndex
CREATE UNIQUE INDEX "auditor_metrics_period_periodType_key" ON "auditor_metrics"("period", "periodType");

-- AddForeignKey
ALTER TABLE "auditor_chats" ADD CONSTRAINT "auditor_chats_configId_fkey" FOREIGN KEY ("configId") REFERENCES "auditor_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditor_messages" ADD CONSTRAINT "auditor_messages_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "auditor_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditor_reports" ADD CONSTRAINT "auditor_reports_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "auditor_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
