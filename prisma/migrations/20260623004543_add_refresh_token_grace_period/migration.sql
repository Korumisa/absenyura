-- AlterTable
ALTER TABLE "User" ADD COLUMN     "previous_refresh_rotated_at" TIMESTAMP(3),
ADD COLUMN     "previous_refresh_token_hash" TEXT;
