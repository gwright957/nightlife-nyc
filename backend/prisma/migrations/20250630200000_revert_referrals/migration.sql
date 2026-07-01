-- DropForeignKey
ALTER TABLE "Referral" DROP CONSTRAINT IF EXISTS "Referral_referrerId_fkey";
ALTER TABLE "Referral" DROP CONSTRAINT IF EXISTS "Referral_referredUserId_fkey";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_referredById_fkey";

-- DropTable
DROP TABLE IF EXISTS "Referral";

-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "referralCode";
ALTER TABLE "User" DROP COLUMN IF EXISTS "referredById";

-- DropIndex
DROP INDEX IF EXISTS "User_referralCode_key";
DROP INDEX IF EXISTS "User_referredById_idx";
