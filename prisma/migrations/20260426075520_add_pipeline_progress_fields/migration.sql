-- AlterEnum
ALTER TYPE "ExperienceSource" RENAME VALUE 'E3_CROSS_INDUSTRY' TO 'E3_BOOK';

-- AlterTable: add pipeline progress fields to Raw
ALTER TABLE "Raw" ADD COLUMN "atomPipelineStatus" TEXT DEFAULT 'idle';
ALTER TABLE "Raw" ADD COLUMN "qaPipelineStatus" TEXT DEFAULT 'idle';
ALTER TABLE "Raw" ADD COLUMN "atomPipelineProgress" JSONB;
ALTER TABLE "Raw" ADD COLUMN "qaPipelineProgress" JSONB;
