-- Replace phone auth with email auth and add OtpCode table

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OtpCode_email_createdAt_idx" ON "OtpCode"("email", "createdAt");

-- Migrate User: phone -> email
ALTER TABLE "User" ADD COLUMN "email" TEXT;

UPDATE "User" SET "email" = 'legacy_' || "id" || '@nightlife.local' WHERE "email" IS NULL;

ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;

DROP INDEX IF EXISTS "User_phone_key";
ALTER TABLE "User" DROP COLUMN "phone";

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
