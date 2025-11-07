-- AlterTable
ALTER TABLE "public"."conversation" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "starred" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tags" TEXT[];

-- CreateIndex
CREATE INDEX "conversation_updatedAt_idx" ON "public"."conversation"("updatedAt");

-- CreateIndex
CREATE INDEX "conversation_category_idx" ON "public"."conversation"("category");
