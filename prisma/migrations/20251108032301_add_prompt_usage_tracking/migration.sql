-- CreateEnum
CREATE TYPE "public"."PromptScope" AS ENUM ('USER', 'ORGANIZATION', 'GLOBAL');

-- CreateTable
CREATE TABLE "public"."prompt" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "scope" "public"."PromptScope" NOT NULL DEFAULT 'USER',
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prompt_favorite" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prompt_rating" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "promptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prompt_category_idx" ON "public"."prompt"("category");

-- CreateIndex
CREATE INDEX "prompt_organizationId_idx" ON "public"."prompt"("organizationId");

-- CreateIndex
CREATE INDEX "prompt_userId_idx" ON "public"."prompt"("userId");

-- CreateIndex
CREATE INDEX "prompt_isPublic_scope_idx" ON "public"."prompt"("isPublic", "scope");

-- CreateIndex
CREATE INDEX "prompt_createdAt_idx" ON "public"."prompt"("createdAt");

-- CreateIndex
CREATE INDEX "prompt_favorite_userId_idx" ON "public"."prompt_favorite"("userId");

-- CreateIndex
CREATE INDEX "prompt_favorite_promptId_idx" ON "public"."prompt_favorite"("promptId");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_favorite_promptId_userId_key" ON "public"."prompt_favorite"("promptId", "userId");

-- CreateIndex
CREATE INDEX "prompt_rating_promptId_idx" ON "public"."prompt_rating"("promptId");

-- CreateIndex
CREATE INDEX "prompt_rating_userId_idx" ON "public"."prompt_rating"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_rating_promptId_userId_key" ON "public"."prompt_rating"("promptId", "userId");

-- AddForeignKey
ALTER TABLE "public"."prompt" ADD CONSTRAINT "prompt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prompt" ADD CONSTRAINT "prompt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prompt_favorite" ADD CONSTRAINT "prompt_favorite_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "public"."prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prompt_favorite" ADD CONSTRAINT "prompt_favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prompt_rating" ADD CONSTRAINT "prompt_rating_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "public"."prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prompt_rating" ADD CONSTRAINT "prompt_rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
