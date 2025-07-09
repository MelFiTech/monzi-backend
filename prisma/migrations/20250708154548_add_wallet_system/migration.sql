-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0.00,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "virtualAccountNumber" TEXT,
    "providerId" TEXT,
    "providerAccountName" TEXT,
    "pin" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dailyLimit" REAL NOT NULL DEFAULT 100000,
    "monthlyLimit" REAL NOT NULL DEFAULT 1000000,
    "lastTransactionAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "fee" REAL NOT NULL DEFAULT 0,
    "senderWalletId" TEXT,
    "receiverWalletId" TEXT,
    "bankAccountId" TEXT,
    "providerReference" TEXT,
    "providerResponse" JSONB,
    "senderBalanceBefore" REAL,
    "senderBalanceAfter" REAL,
    "receiverBalanceBefore" REAL,
    "receiverBalanceAfter" REAL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "wallet_transactions_senderWalletId_fkey" FOREIGN KEY ("senderWalletId") REFERENCES "wallets" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "wallet_transactions_receiverWalletId_fkey" FOREIGN KEY ("receiverWalletId") REFERENCES "wallets" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "wallet_transactions_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "password" TEXT,
    "bvn" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "kycStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "kycVerifiedAt" DATETIME,
    "selfieUrl" TEXT,
    "bvnVerifiedAt" DATETIME,
    "otpCode" TEXT,
    "otpExpiresAt" DATETIME
);
INSERT INTO "new_users" ("bvn", "createdAt", "email", "firstName", "id", "isOnboarded", "isVerified", "lastName", "otpCode", "otpExpiresAt", "password", "phone", "updatedAt") SELECT "bvn", "createdAt", "email", "firstName", "id", "isOnboarded", "isVerified", "lastName", "otpCode", "otpExpiresAt", "password", "phone", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_virtualAccountNumber_key" ON "wallets"("virtualAccountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_reference_key" ON "wallet_transactions"("reference");
