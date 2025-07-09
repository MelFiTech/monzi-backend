-- CreateTable
CREATE TABLE "fee_configurations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "percentage" REAL,
    "fixedAmount" REAL,
    "minimumFee" REAL,
    "maximumFee" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "fee_configurations_type_key" ON "fee_configurations"("type");
