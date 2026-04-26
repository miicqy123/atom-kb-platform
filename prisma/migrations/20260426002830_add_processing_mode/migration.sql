-- CreateEnum
CREATE TYPE "ProcessingMode" AS ENUM ('ATOM_ONLY', 'QA_ONLY', 'DUAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ConversionStatus" ADD VALUE 'ATOM_PROCESSING';
ALTER TYPE "ConversionStatus" ADD VALUE 'QA_PROCESSING';
ALTER TYPE "ConversionStatus" ADD VALUE 'DUAL_PROCESSING';
ALTER TYPE "ConversionStatus" ADD VALUE 'ATOM_DONE';
ALTER TYPE "ConversionStatus" ADD VALUE 'QA_DONE';
ALTER TYPE "ConversionStatus" ADD VALUE 'DUAL_DONE';

-- AlterTable
ALTER TABLE "Raw" ADD COLUMN     "atomCount" INTEGER,
ADD COLUMN     "processingMode" "ProcessingMode",
ADD COLUMN     "qaCount" INTEGER;
