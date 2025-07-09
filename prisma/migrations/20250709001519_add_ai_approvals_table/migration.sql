-- CreateTable
CREATE TABLE "ai_approvals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "approvalType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "aiProvider" TEXT NOT NULL,
    "aiResponse" JSONB NOT NULL,
    "confidence" REAL NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "reviewComment" TEXT,
    "imageUrl" TEXT,
    "relatedData" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ai_approvals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
