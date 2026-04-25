-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('SHORT_VIDEO', 'MOMENTS', 'SALES_TALK', 'LIVE_TALK', 'BRAND_STORY', 'IMAGE_PROMPT', 'ANALYSIS', 'GENERAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('DOUYIN', 'XIAOHONGSHU', 'SHIPINHAO', 'WECHAT_MOMENTS', 'GENERAL');

-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('BOSS', 'EXECUTOR', 'CONSUMER', 'GENERAL');

-- CreateEnum
CREATE TYPE "PromptStatus" AS ENUM ('DRAFT', 'OPTIMIZING', 'READY', 'PUBLISHED');

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "description" TEXT NOT NULL,
    "platform" "Platform" NOT NULL DEFAULT 'GENERAL',
    "audience" "Audience" NOT NULL DEFAULT 'GENERAL',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rawIds" TEXT[],
    "promptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fullText" TEXT NOT NULL,
    "slots" JSONB NOT NULL,
    "thinkingModel" TEXT,
    "score" DOUBLE PRECISION,
    "optimizationRound" INTEGER NOT NULL DEFAULT 0,
    "maxRounds" INTEGER NOT NULL DEFAULT 3,
    "status" "PromptStatus" NOT NULL DEFAULT 'DRAFT',
    "linkedAtomIds" TEXT[],
    "linkedPackIds" TEXT[],
    "scoreDimensions" JSONB,
    "optimizerUsed" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Task_promptId_key" ON "Task"("promptId");

-- CreateIndex
CREATE INDEX "Task_projectId_status_idx" ON "Task"("projectId", "status");

-- CreateIndex
CREATE INDEX "Prompt_projectId_status_idx" ON "Prompt"("projectId", "status");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prompt" ADD CONSTRAINT "Prompt_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
