-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "promotionalNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "transactionNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
