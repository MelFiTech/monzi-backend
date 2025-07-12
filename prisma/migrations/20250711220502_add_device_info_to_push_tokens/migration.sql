-- AlterTable
ALTER TABLE "push_tokens" ADD COLUMN     "appOwnership" TEXT,
ADD COLUMN     "appVersion" TEXT,
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "buildVersion" TEXT,
ADD COLUMN     "deviceName" TEXT,
ADD COLUMN     "executionEnvironment" TEXT,
ADD COLUMN     "isDevice" BOOLEAN,
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "osVersion" TEXT;
