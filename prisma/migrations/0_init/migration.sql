-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'TENANT_ADMIN', 'KNOWLEDGE_EDITOR', 'PROMPT_ENGINEER', 'OPERATOR', 'REVIEWER', 'READONLY');

-- CreateEnum
CREATE TYPE "RawFormat" AS ENUM ('WORD', 'PDF', 'PPT', 'EXCEL', 'AUDIO', 'VIDEO', 'SCREENSHOT', 'WEB_LINK');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('THEORY', 'CASE_STUDY', 'METHODOLOGY', 'FAQ', 'SCRIPT', 'REGULATION', 'PRODUCT_DOC', 'TRAINING_MATERIAL', 'MEETING_RECORD', 'CUSTOMER_VOICE', 'INDUSTRY_REPORT', 'COMPETITOR_ANALYSIS', 'INTERNAL_WIKI', 'OTHER');

-- CreateEnum
CREATE TYPE "ExperienceSource" AS ENUM ('E1_COMPANY', 'E2_INDUSTRY', 'E3_CROSS_INDUSTRY');

-- CreateEnum
CREATE TYPE "ConversionStatus" AS ENUM ('PENDING', 'CONVERTING', 'CONVERTED', 'FAILED');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('DRAFT', 'TESTING', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BlueprintStatus" AS ENUM ('CONFIGURING', 'TESTING', 'ONLINE', 'DEPRECATED', 'DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExposureLevel" AS ENUM ('INTERNAL', 'EXTERNAL', 'NEEDS_APPROVAL', 'STRICTLY_FORBIDDEN');

-- CreateEnum
CREATE TYPE "Layer" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "Granularity" AS ENUM ('ATOM', 'MODULE', 'PACK');

-- CreateEnum
CREATE TYPE "WorkflowMode" AS ENUM ('DAG', 'REACT', 'ROLE_COLLABORATION', 'STATEFUL_GRAPH');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'DEGRADED', 'HUMAN_TAKEOVER');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'APPROVED', 'MODIFIED_APPROVED', 'REJECTED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('RED', 'YELLOW', 'GREEN');

-- CreateEnum
CREATE TYPE "QADifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'EXPERT');

-- CreateEnum
CREATE TYPE "ContentCategory" AS ENUM ('CAT_WHO', 'CAT_WHAT', 'CAT_HOW', 'CAT_STYLE', 'CAT_FENCE', 'CAT_PROOF');

-- CreateEnum
CREATE TYPE "ContentSubCategory" AS ENUM ('WHO_BRAND', 'WHO_ROLE', 'WHO_AUDIENCE', 'WHO_TERM', 'WHAT_PRODUCT', 'WHAT_USP', 'WHAT_PRICE', 'WHAT_CERT', 'HOW_SOP', 'HOW_METHOD', 'HOW_TACTIC', 'HOW_BEST', 'STYLE_HOOK', 'STYLE_WORD', 'STYLE_TONE', 'STYLE_RHYTHM', 'FENCE_BAN', 'FENCE_ALLOW', 'FENCE_LAW', 'FENCE_BLUR', 'PROOF_CASE', 'PROOF_DATA', 'PROOF_FAIL', 'PROOF_COMPARE');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "logo" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "maxWorkspaces" INTEGER NOT NULL DEFAULT 5,
    "maxProjects" INTEGER NOT NULL DEFAULT 20,
    "monthlyTokenQuota" BIGINT NOT NULL DEFAULT 10000000,
    "storageQuotaMB" INTEGER NOT NULL DEFAULT 10240,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "ownerId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'TEAM',
    "visibility" TEXT NOT NULL DEFAULT 'TEAM',

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'client',
    "description" TEXT,
    "workspaceId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "avatar" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'READONLY',
    "tenantId" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,

    CONSTRAINT "WorkspaceUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Raw" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "format" "RawFormat" NOT NULL,
    "materialType" "MaterialType" NOT NULL,
    "experienceSource" "ExperienceSource" NOT NULL,
    "originalFileUrl" TEXT,
    "originalFileName" TEXT,
    "markdownContent" TEXT,
    "conversionStatus" "ConversionStatus" NOT NULL DEFAULT 'PENDING',
    "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
    "exposureLevel" "ExposureLevel" NOT NULL DEFAULT 'INTERNAL',
    "fileSize" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Raw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Atom" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "rawId" TEXT,
    "layer" "Layer" NOT NULL,
    "granularity" "Granularity" NOT NULL DEFAULT 'ATOM',
    "dimensions" INTEGER[],
    "slotMappings" TEXT[],
    "experienceSource" "ExperienceSource" NOT NULL,
    "category" "ContentCategory",
    "subcategory" "ContentSubCategory",
    "exposureLevel" "ExposureLevel" NOT NULL DEFAULT 'INTERNAL',
    "scenarios" JSONB,
    "status" "AssetStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "activeVersion" INTEGER NOT NULL DEFAULT 1,
    "wordCount" INTEGER,
    "tokenEstimate" INTEGER,
    "parentAtomId" TEXT,
    "validUntil" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Atom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QAPair" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "rawId" TEXT,
    "tags" TEXT[],
    "difficulty" "QADifficulty" NOT NULL DEFAULT 'BEGINNER',
    "scenarios" TEXT[],
    "questionKeywords" TEXT[],
    "materialType" "MaterialType" NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "answerWordCount" INTEGER,
    "qualityScore" DOUBLE PRECISION,
    "redlineResults" JSONB,
    "specialMarks" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QAPair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blueprint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "enterprise" TEXT,
    "position" TEXT,
    "taskName" TEXT,
    "workflowMode" "WorkflowMode" NOT NULL DEFAULT 'DAG',
    "status" "BlueprintStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "activeVersion" INTEGER NOT NULL DEFAULT 1,
    "scenarioTags" JSONB,
    "totalTokenEstimate" INTEGER,
    "qualityPassRate" DOUBLE PRECISION,
    "lastTestTime" TIMESTAMP(3),
    "responsibleId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "category" TEXT,
    "createdBy" TEXT,
    "description" TEXT,
    "exposureLevel" "ExposureLevel" NOT NULL DEFAULT 'INTERNAL',

    CONSTRAINT "Blueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotConfig" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "slotKey" TEXT NOT NULL,
    "subSlotKey" TEXT,
    "order" INTEGER NOT NULL,
    "maxTokens" INTEGER,
    "conflictPriority" TEXT[] DEFAULT ARRAY['D', 'C', 'B', 'A']::TEXT[],
    "dedupe" BOOLEAN NOT NULL DEFAULT true,
    "fallbackStrategy" TEXT NOT NULL DEFAULT 'skip',
    "assembledContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlotConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FetchRule" (
    "id" TEXT NOT NULL,
    "slotConfigId" TEXT NOT NULL,
    "layers" "Layer"[],
    "dimensions" INTEGER[],
    "categories" "ContentCategory"[],
    "subcategories" "ContentSubCategory"[],
    "subSlots" TEXT[],
    "topN" INTEGER NOT NULL DEFAULT 5,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FetchRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtomBlueprint" (
    "atomId" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "slotKey" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AtomBlueprint_pkey" PRIMARY KEY ("atomId","blueprintId")
);

-- CreateTable
CREATE TABLE "AtomQAPair" (
    "atomId" TEXT NOT NULL,
    "qaPairId" TEXT NOT NULL,

    CONSTRAINT "AtomQAPair_pkey" PRIMARY KEY ("atomId","qaPairId")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectId" TEXT NOT NULL,
    "tools" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalRuns" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION,
    "avgDuration" DOUBLE PRECISION,
    "avgTokens" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "capabilities" TEXT[],
    "category" TEXT,
    "config" JSONB,
    "createdBy" TEXT,
    "exposureLevel" "ExposureLevel" NOT NULL DEFAULT 'INTERNAL',
    "role" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentBlueprint" (
    "agentId" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,

    CONSTRAINT "AgentBlueprint_pkey" PRIMARY KEY ("agentId","blueprintId")
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT,
    "projectId" TEXT NOT NULL,
    "blueprintVersion" INTEGER,
    "workflowMode" "WorkflowMode",
    "status" "RunStatus" NOT NULL DEFAULT 'RUNNING',
    "inputData" JSONB,
    "outputContent" TEXT,
    "tokenUsage" INTEGER,
    "duration" DOUBLE PRECISION,
    "cost" DOUBLE PRECISION,
    "traceId" TEXT,
    "atomVersionSnapshot" JSONB,
    "qaVersionSnapshot" JSONB,
    "contentPerformance" JSONB,
    "roiMetrics" JSONB,
    "conversionOutcome" JSONB,
    "nodeTraces" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "input" JSONB,
    "startedBy" TEXT,
    "workflowId" TEXT,
    "businessResultA" JSONB,
    "businessResultB" JSONB,
    "businessResultC" JSONB,

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationRecord" (
    "id" TEXT NOT NULL,
    "workflowRunId" TEXT NOT NULL,
    "s8Scores" JSONB,
    "s9OverallScore" DOUBLE PRECISION,
    "s9Dimensions" JSONB,
    "redlineScanResults" JSONB,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewTask" (
    "id" TEXT NOT NULL,
    "workflowRunId" TEXT NOT NULL,
    "triggerReason" TEXT NOT NULL,
    "urgency" "Urgency" NOT NULL DEFAULT 'YELLOW',
    "assigneeId" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "result" TEXT,
    "modifiedOutput" TEXT,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "workflowRunId" TEXT,
    "type" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "description" TEXT,
    "rootCause" TEXT,
    "resolution" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "traceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT,
    "changeSummary" TEXT,
    "diff" JSONB,
    "traceId" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DimensionConfig" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "layer" "Layer" NOT NULL,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DimensionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioTag" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tenantId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScenarioTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BasePack" (
    "id" TEXT NOT NULL,
    "slotKey" TEXT NOT NULL,
    "subSlotKey" TEXT,
    "content" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "scopeValue" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BasePack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectId" TEXT NOT NULL,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "config" JSONB,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "exposureLevel" "ExposureLevel" NOT NULL DEFAULT 'INTERNAL',
    "triggerType" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT,
    "parentId" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "icon" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedChunk" (
    "id" TEXT NOT NULL,
    "rawId" TEXT NOT NULL,
    "station" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "processedBy" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessedChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedTag" (
    "id" TEXT NOT NULL,
    "rawId" TEXT NOT NULL,
    "station" TEXT NOT NULL,
    "tags" TEXT[],
    "processedBy" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessedTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedQaPair" (
    "id" TEXT NOT NULL,
    "rawId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "processedBy" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedQaPair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedStep" (
    "id" TEXT NOT NULL,
    "rawId" TEXT NOT NULL,
    "station" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "processedBy" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Model" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutingRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "projectId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutingRuleModelConnection" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,

    CONSTRAINT "RoutingRuleModelConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelEndpoint" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "endpointUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "rateLimit" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "scene" TEXT NOT NULL,
    "defaultModel" TEXT NOT NULL,
    "fallbackModel" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "config" JSONB,

    CONSTRAINT "ModelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentParseConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "taskType" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "providerType" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "apiEndpoint" TEXT,
    "apiKey" TEXT,
    "config" JSONB DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "monthlyLimit" INTEGER NOT NULL DEFAULT 0,
    "monthlyUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentParseConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "rateLimit" INTEGER NOT NULL DEFAULT 60,
    "callerType" TEXT NOT NULL DEFAULT 'EXTERNAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceUser_userId_workspaceId_key" ON "WorkspaceUser"("userId", "workspaceId");

-- CreateIndex
CREATE INDEX "Raw_projectId_conversionStatus_idx" ON "Raw"("projectId", "conversionStatus");

-- CreateIndex
CREATE INDEX "Atom_projectId_status_layer_idx" ON "Atom"("projectId", "status", "layer");

-- CreateIndex
CREATE INDEX "Atom_dimensions_idx" ON "Atom"("dimensions");

-- CreateIndex
CREATE INDEX "Atom_projectId_category_subcategory_idx" ON "Atom"("projectId", "category", "subcategory");

-- CreateIndex
CREATE INDEX "QAPair_projectId_status_idx" ON "QAPair"("projectId", "status");

-- CreateIndex
CREATE INDEX "Blueprint_projectId_status_idx" ON "Blueprint"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SlotConfig_blueprintId_slotKey_subSlotKey_key" ON "SlotConfig"("blueprintId", "slotKey", "subSlotKey");

-- CreateIndex
CREATE INDEX "WorkflowRun_projectId_status_idx" ON "WorkflowRun"("projectId", "status");

-- CreateIndex
CREATE INDEX "WorkflowRun_blueprintId_idx" ON "WorkflowRun"("blueprintId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DimensionConfig_number_tenantId_key" ON "DimensionConfig"("number", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioTag_type_name_tenantId_key" ON "ScenarioTag"("type", "name", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "BasePack_slotKey_subSlotKey_scope_scopeValue_key" ON "BasePack"("slotKey", "subSlotKey", "scope", "scopeValue");

-- CreateIndex
CREATE INDEX "Workflow_projectId_status_idx" ON "Workflow"("projectId", "status");

-- CreateIndex
CREATE INDEX "Category_projectId_type_idx" ON "Category"("projectId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedChunk_rawId_station_key" ON "ProcessedChunk"("rawId", "station");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedTag_rawId_station_key" ON "ProcessedTag"("rawId", "station");

-- CreateIndex
CREATE UNIQUE INDEX "RoutingRuleModelConnection_ruleId_modelId_key" ON "RoutingRuleModelConnection"("ruleId", "modelId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelConfig_scene_tenantId_key" ON "ModelConfig"("scene", "tenantId");

-- CreateIndex
CREATE INDEX "DocumentParseConfig_tenantId_taskType_enabled_idx" ON "DocumentParseConfig"("tenantId", "taskType", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentParseConfig_tenantId_taskType_priority_key" ON "DocumentParseConfig"("tenantId", "taskType", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceUser" ADD CONSTRAINT "WorkspaceUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceUser" ADD CONSTRAINT "WorkspaceUser_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Raw" ADD CONSTRAINT "Raw_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atom" ADD CONSTRAINT "Atom_parentAtomId_fkey" FOREIGN KEY ("parentAtomId") REFERENCES "Atom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atom" ADD CONSTRAINT "Atom_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atom" ADD CONSTRAINT "Atom_rawId_fkey" FOREIGN KEY ("rawId") REFERENCES "Raw"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QAPair" ADD CONSTRAINT "QAPair_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QAPair" ADD CONSTRAINT "QAPair_rawId_fkey" FOREIGN KEY ("rawId") REFERENCES "Raw"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blueprint" ADD CONSTRAINT "Blueprint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotConfig" ADD CONSTRAINT "SlotConfig_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "Blueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FetchRule" ADD CONSTRAINT "FetchRule_slotConfigId_fkey" FOREIGN KEY ("slotConfigId") REFERENCES "SlotConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtomBlueprint" ADD CONSTRAINT "AtomBlueprint_atomId_fkey" FOREIGN KEY ("atomId") REFERENCES "Atom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtomBlueprint" ADD CONSTRAINT "AtomBlueprint_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "Blueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtomQAPair" ADD CONSTRAINT "AtomQAPair_atomId_fkey" FOREIGN KEY ("atomId") REFERENCES "Atom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtomQAPair" ADD CONSTRAINT "AtomQAPair_qaPairId_fkey" FOREIGN KEY ("qaPairId") REFERENCES "QAPair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentBlueprint" ADD CONSTRAINT "AgentBlueprint_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentBlueprint" ADD CONSTRAINT "AgentBlueprint_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "Blueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "Blueprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationRecord" ADD CONSTRAINT "EvaluationRecord_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTask" ADD CONSTRAINT "ReviewTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTask" ADD CONSTRAINT "ReviewTask_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DimensionConfig" ADD CONSTRAINT "DimensionConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioTag" ADD CONSTRAINT "ScenarioTag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedChunk" ADD CONSTRAINT "ProcessedChunk_rawId_fkey" FOREIGN KEY ("rawId") REFERENCES "Raw"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedTag" ADD CONSTRAINT "ProcessedTag_rawId_fkey" FOREIGN KEY ("rawId") REFERENCES "Raw"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedQaPair" ADD CONSTRAINT "ProcessedQaPair_rawId_fkey" FOREIGN KEY ("rawId") REFERENCES "Raw"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedStep" ADD CONSTRAINT "ProcessedStep_rawId_fkey" FOREIGN KEY ("rawId") REFERENCES "Raw"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ModelProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingRule" ADD CONSTRAINT "RoutingRule_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ModelProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingRuleModelConnection" ADD CONSTRAINT "RoutingRuleModelConnection_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingRuleModelConnection" ADD CONSTRAINT "RoutingRuleModelConnection_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "RoutingRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelEndpoint" ADD CONSTRAINT "ModelEndpoint_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ModelProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelConfig" ADD CONSTRAINT "ModelConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentParseConfig" ADD CONSTRAINT "DocumentParseConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

