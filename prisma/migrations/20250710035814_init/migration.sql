-- CreateEnum
CREATE TYPE "SystemConfigKey" AS ENUM ('DEFAULT_WALLET_PROVIDER', 'DEFAULT_TRANSFER_PROVIDER', 'MAINTENANCE_MODE', 'KYC_REQUIRED', 'AI_AUTO_APPROVE_THRESHOLD');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AiApprovalType" AS ENUM ('TRANSACTION', 'KYC_VERIFICATION', 'RISK_ASSESSMENT');

-- CreateEnum
CREATE TYPE "AiApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'MANUAL_REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('FUNDING', 'TRANSFER', 'WITHDRAWAL', 'REVERSAL');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('TRANSFER', 'PAYMENT', 'WITHDRAWAL', 'DEPOSIT');

-- CreateEnum
CREATE TYPE "OcrStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('TRANSFER', 'WITHDRAWAL', 'FUNDING', 'INTERNATIONAL_TRANSFER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "AiQueryStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "gender" "Gender" NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "passcode" TEXT NOT NULL,
    "bvn" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "kycVerifiedAt" TIMESTAMP(3),
    "selfieUrl" TEXT,
    "bvnVerifiedAt" TIMESTAMP(3),
    "bvnProviderResponse" JSONB,
    "otpCode" TEXT,
    "otpExpiresAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "virtualAccountNumber" TEXT,
    "providerId" TEXT,
    "providerAccountName" TEXT,
    "provider" TEXT,
    "bankName" TEXT,
    "pin" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dailyLimit" DOUBLE PRECISION NOT NULL DEFAULT 100000,
    "monthlyLimit" DOUBLE PRECISION NOT NULL DEFAULT 1000000,
    "lastTransactionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "senderWalletId" TEXT,
    "receiverWalletId" TEXT,
    "bankAccountId" TEXT,
    "providerReference" TEXT,
    "providerResponse" JSONB,
    "senderBalanceBefore" DOUBLE PRECISION,
    "senderBalanceAfter" DOUBLE PRECISION,
    "receiverBalanceBefore" DOUBLE PRECISION,
    "receiverBalanceAfter" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT,
    "routingNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "description" TEXT,
    "reference" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "type" "TransactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "fromAccountId" TEXT,
    "toAccountId" TEXT,
    "ocrScanId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocr_scans" (
    "id" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "cleanedText" TEXT,
    "extractedData" JSONB,
    "imageUrl" TEXT,
    "confidence" DOUBLE PRECISION,
    "status" "OcrStatus" NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ocr_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_queries" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT,
    "model" TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
    "status" "AiQueryStatus" NOT NULL DEFAULT 'PROCESSING',
    "structured" JSONB,
    "tokens" INTEGER,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ai_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_configurations" (
    "id" TEXT NOT NULL,
    "feeType" "FeeType" NOT NULL,
    "percentage" DOUBLE PRECISION,
    "fixedAmount" DOUBLE PRECISION,
    "minAmount" DOUBLE PRECISION,
    "maxAmount" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configurations" (
    "id" TEXT NOT NULL,
    "key" "SystemConfigKey" NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_approvals" (
    "id" TEXT NOT NULL,
    "type" "AiApprovalType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" "AiApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "confidence" DOUBLE PRECISION,
    "reasoning" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ai_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_virtualAccountNumber_key" ON "wallets"("virtualAccountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_reference_key" ON "wallet_transactions"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_accountNumber_bankCode_key" ON "accounts"("accountNumber", "bankCode");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_reference_key" ON "transactions"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "fee_configurations_feeType_key" ON "fee_configurations"("feeType");

-- CreateIndex
CREATE UNIQUE INDEX "system_configurations_key_key" ON "system_configurations"("key");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_senderWalletId_fkey" FOREIGN KEY ("senderWalletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_receiverWalletId_fkey" FOREIGN KEY ("receiverWalletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_ocrScanId_fkey" FOREIGN KEY ("ocrScanId") REFERENCES "ocr_scans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr_scans" ADD CONSTRAINT "ocr_scans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_queries" ADD CONSTRAINT "ai_queries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_approvals" ADD CONSTRAINT "ai_approvals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
