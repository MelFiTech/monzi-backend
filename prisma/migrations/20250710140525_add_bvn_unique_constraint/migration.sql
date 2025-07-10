/*
  Warnings:

  - A unique constraint covering the columns `[bvn]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "users_bvn_key" ON "users"("bvn");
