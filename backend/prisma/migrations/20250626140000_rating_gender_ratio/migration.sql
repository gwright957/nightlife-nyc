-- Replace crowdScore with genderRatio on Rating

ALTER TABLE "Rating" ADD COLUMN "genderRatio" INTEGER;

UPDATE "Rating" SET "genderRatio" = 5 WHERE "genderRatio" IS NULL;

ALTER TABLE "Rating" ALTER COLUMN "genderRatio" SET NOT NULL;

ALTER TABLE "Rating" DROP COLUMN "crowdScore";
