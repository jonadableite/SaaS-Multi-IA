-- AlterTable
ALTER TABLE "public"."agent" ALTER COLUMN "tags" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "user_api_key_key_idx" ON "public"."user_api_key"("key");
