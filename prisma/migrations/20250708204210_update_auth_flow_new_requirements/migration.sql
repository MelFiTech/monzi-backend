/*
  Warnings:

  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - Added the required column `dateOfBirth` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passcode` to the `users` table without a default value. This is not possible if the table is not empty.
  - Made the column `phone` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "gender" TEXT NOT NULL,
    "dateOfBirth" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "passcode" TEXT NOT NULL,
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
INSERT INTO "new_users" ("bvn", "bvnVerifiedAt", "createdAt", "email", "firstName", "id", "isOnboarded", "isVerified", "kycStatus", "kycVerifiedAt", "lastName", "otpCode", "otpExpiresAt", "phone", "selfieUrl", "updatedAt") SELECT "bvn", "bvnVerifiedAt", "createdAt", "email", "firstName", "id", "isOnboarded", "isVerified", "kycStatus", "kycVerifiedAt", "lastName", "otpCode", "otpExpiresAt", "phone", "selfieUrl", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
