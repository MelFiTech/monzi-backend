/*
  Warnings:

  - You are about to drop the column `metadata` on the `ai_queries` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ai_queries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prompt" TEXT NOT NULL,
    "response" TEXT,
    "model" TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "structured" JSONB,
    "tokens" INTEGER,
    "confidence" REAL,
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    CONSTRAINT "ai_queries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ai_queries" ("createdAt", "id", "model", "prompt", "response", "status", "structured", "tokens", "updatedAt", "userId") SELECT "createdAt", "id", coalesce("model", 'gemini-2.0-flash') AS "model", "prompt", "response", "status", "structured", "tokens", "updatedAt", "userId" FROM "ai_queries";
DROP TABLE "ai_queries";
ALTER TABLE "new_ai_queries" RENAME TO "ai_queries";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
