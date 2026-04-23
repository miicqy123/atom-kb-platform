# 后端工程代码（Prisma Schema + tRPC API + Auth + Docker）

<aside>
🏗️

**技术栈**：Next.js 14 App Router · TypeScript 5 · Prisma 5 · PostgreSQL 16 · tRPC 11 · Qdrant · NextAuth.js 5 · Zod · Docker
本页包含平台全部后端基础设施代码，含完整数据库 Schema（对应 PRD §9 全部实体）、认证鉴权、RBAC 权限、全量 API 路由、向量检索服务及容器化部署配置。

</aside>

---

## 0. 项目目录结构

```
atom-kb-platform/
├── prisma/
│   ├── schema.prisma          # 完整数据模型
│   ├── seed.ts                # 初始化种子数据
│   └── migrations/
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── api/
│   │   │   ├── trpc/[trpc]/route.ts
│   │   │   └── auth/[...nextauth]/route.ts
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx      # 带侧边栏的仪表盘布局
│   │   │   ├── knowledge/      # 📚 知识中心
│   │   │   │   ├── raw/page.tsx           # KC-01
│   │   │   │   ├── workbench/page.tsx     # KC-02
│   │   │   │   ├── atoms/page.tsx         # KC-03
│   │   │   │   ├── qa-pairs/page.tsx      # KC-04
│   │   │   │   ├── taxonomy/page.tsx      # KC-05
│   │   │   │   ├── mappings/page.tsx      # KC-06
│   │   │   │   └── qa-search/page.tsx     # KC-07
│   │   │   ├── prompts/       # 📝 提示词工厂
│   │   │   │   ├── blueprints/page.tsx    # PF-01
│   │   │   │   ├── editor/[id]/page.tsx   # PF-02
│   │   │   │   ├── versions/[id]/page.tsx # PF-03
│   │   │   │   ├── evaluation/page.tsx    # PF-04
│   │   │   │   └── base-packs/page.tsx    # PF-05
│   │   │   ├── orchestration/ # ⚙️ 编排中心
│   │   │   │   ├── agents/page.tsx        # OC-01
│   │   │   │   ├── workflows/page.tsx     # OC-02
│   │   │   │   ├── runs/page.tsx          # OC-03
│   │   │   │   └── review/page.tsx        # OC-04
│   │   │   ├── governance/    # 🛡️ 治理中心
│   │   │   │   ├── dashboard/page.tsx     # GC-01
│   │   │   │   ├── sla/page.tsx           # GC-02
│   │   │   │   ├── audit/page.tsx         # GC-03
│   │   │   │   └── gateway/page.tsx       # GC-04
│   │   │   └── admin/         # 🏢 企业后台
│   │   │       ├── tenants/page.tsx       # Admin-01
│   │   │       ├── workspaces/page.tsx    # Admin-02
│   │   │       ├── projects/page.tsx      # Admin-03
│   │   │       ├── users/page.tsx         # Admin-04
│   │   │       ├── lifecycle/page.tsx     # Admin-05
│   │   │       └── settings/page.tsx      # Admin-06
│   ├── server/
│   │   ├── trpc.ts            # tRPC 初始化
│   │   ├── context.ts         # 请求上下文
│   │   ├── routers/
│   │   │   ├── _app.ts        # 根路由
│   │   │   ├── raw.ts
│   │   │   ├── atom.ts
│   │   │   ├── qaPair.ts
│   │   │   ├── blueprint.ts
│   │   │   ├── slotConfig.ts
│   │   │   ├── workflowRun.ts
│   │   │   ├── agent.ts
│   │   │   ├── evaluation.ts
│   │   │   ├── review.ts
│   │   │   ├── tenant.ts
│   │   │   ├── workspace.ts
│   │   │   ├── project.ts
│   │   │   ├── user.ts
│   │   │   ├── auditLog.ts
│   │   │   ├── modelConfig.ts
│   │   │   ├── taxonomy.ts
│   │   │   ├── basePack.ts
│   │   │   ├── analytics.ts
│   │   │   └── vector.ts
│   │   └── services/
│   │       ├── conversion.ts  # 格式归一引擎
│   │       ├── chunking.ts    # 智能切块引擎
│   │       ├── tagging.ts     # 自动打标引擎
│   │       ├── qaGeneration.ts# QA 生成引擎
│   │       ├── assembly.ts    # 蓝图装配引擎
│   │       ├── evaluation.ts  # S8/S9 质检引擎
│   │       ├── vector.ts      # 向量检索服务
│   │       └── modelGateway.ts# 模型网关
│   ├── components/            # 前端组件（见前端工程页）
│   ├── hooks/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── trpc.ts            # 客户端 tRPC
│   │   ├── auth.ts
│   │   ├── rbac.ts
│   │   ├── utils.ts
│   │   └── constants.ts
│   ├── stores/                # Zustand 状态
│   └── types/
│       └── index.ts
├── docker-compose.yml
├── Dockerfile
├── nginx.conf
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── .env.example
```

---

## 1. 工程配置文件

### package.json

```json
{
  "name": "atom-kb-platform",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbo",
    "build": "prisma generate && next build",
    "start": "next start",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@auth/prisma-adapter": "^2.0.0",
    "@hookform/resolvers": "^3.3.4",
    "@prisma/client": "^5.18.0",
    "@qdrant/js-client-rest": "^1.9.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@tanstack/react-query": "^5.40.0",
    "@tanstack/react-table": "^8.17.0",
    "@trpc/client": "^11.0.0",
    "@trpc/next": "^11.0.0",
    "@trpc/react-query": "^11.0.0",
    "@trpc/server": "^11.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "cmdk": "^1.0.0",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.378.0",
    "next": "^14.2.0",
    "next-auth": "^5.0.0",
    "next-themes": "^0.3.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-hook-form": "^7.51.5",
    "reactflow": "^11.11.3",
    "recharts": "^2.12.7",
    "superjson": "^2.2.1",
    "tailwind-merge": "^2.3.0",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.23.8",
    "zustand": "^4.5.2"
  },
  "devDependencies": {
    "@types/node": "^20.12.0",
    "@types/react": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "prisma": "^5.18.0",
    "tailwindcss": "^3.4.4",
    "tsx": "^4.11.0",
    "typescript": "^5.4.5"
  }
}
```

### next.config.ts

```tsx
import type { NextConfig } from "next";
const config: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  webpack: (config) => {
    config.externals.push("@prisma/client");
    return config;
  },
};
export default config;
```

### tailwind.config.ts

```tsx
import type { Config } from "tailwindcss";
export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand:    { DEFAULT: "#2563EB", light: "#60A5FA", dark: "#1D4ED8" },
        success:  { DEFAULT: "#16A34A", light: "#4ADE80" },
        warning:  { DEFAULT: "#F59E0B", light: "#FCD34D" },
        danger:   { DEFAULT: "#DC2626", light: "#F87171" },
        info:     { DEFAULT: "#8B5CF6", light: "#A78BFA" },
        kc:       "#2563EB",  // 知识中心
        pf:       "#8B5CF6",  // 提示词工厂
        oc:       "#F59E0B",  // 编排中心
        gc:       "#16A34A",  // 治理中心
        admin:    "#6B7280",  // 企业后台
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans SC", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn:  { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { transform: "translateY(8px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

### .env.example

```bash
# ---- Database ----
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/atom_kb?schema=public"
# ---- Auth ----
AUTH_SECRET="your-auth-secret-here"
AUTH_URL="http://localhost:3000"
# ---- Vector DB ----
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY=""
# ---- LLM ----
OPENAI_API_KEY=""
OPENAI_BASE_URL="https://api.openai.com/v1"
DEEPSEEK_API_KEY=""
CLAUDE_API_KEY=""
# ---- Observability ----
LANGSMITH_API_KEY=""
LANGSMITH_PROJECT="atom-kb"
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
# ---- Embedding ----
EMBEDDING_MODEL="text-embedding-3-large"
EMBEDDING_DIM=3072
```

---

## 2. Prisma 数据库 Schema（完整）

### prisma/schema.prisma

```
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "postgresqlExtensions"]
}
datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector, pg_trgm]
}
// ===================== Enums =====================
enum UserRole {
  SUPER_ADMIN
  TENANT_ADMIN
  KNOWLEDGE_EDITOR
  PROMPT_ENGINEER
  OPERATOR
  REVIEWER
  READONLY
}
enum RawFormat {
  WORD
  PDF
  PPT
  EXCEL
  AUDIO
  VIDEO
  SCREENSHOT
  WEB_LINK
}
enum MaterialType {
  THEORY
  CASE_STUDY
  METHODOLOGY
  FAQ
  SCRIPT
  REGULATION
  PRODUCT_DOC
  TRAINING_MATERIAL
  MEETING_RECORD
  CUSTOMER_VOICE
  INDUSTRY_REPORT
  COMPETITOR_ANALYSIS
  INTERNAL_WIKI
  OTHER
}
enum ExperienceSource {
  E1_COMPANY
  E2_INDUSTRY
  E3_CROSS_INDUSTRY
}
enum ConversionStatus {
  PENDING
  CONVERTING
  CONVERTED
  FAILED
}
enum AssetStatus {
  DRAFT
  TESTING
  ACTIVE
  ARCHIVED
}
enum BlueprintStatus {
  CONFIGURING
  TESTING
  ONLINE
  DEPRECATED
}
enum ExposureLevel {
  INTERNAL
  EXTERNAL
  NEEDS_APPROVAL
  STRICTLY_FORBIDDEN
}
enum Layer {
  A
  B
  C
  D
}
enum Granularity {
  ATOM
  MODULE
  PACK
}
enum WorkflowMode {
  DAG
  REACT
  ROLE_COLLABORATION
  STATEFUL_GRAPH
}
enum RunStatus {
  RUNNING
  SUCCESS
  FAILED
  DEGRADED
  HUMAN_TAKEOVER
}
enum ReviewStatus {
  PENDING
  IN_PROGRESS
  APPROVED
  MODIFIED_APPROVED
  REJECTED
  ESCALATED
}
enum IncidentSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
enum Urgency {
  RED
  YELLOW
  GREEN
}
enum QADifficulty {
  BEGINNER
  INTERMEDIATE
  PROFESSIONAL
}
// ============= 组织与权限 (§13.0) =============
model Tenant {
  id               String      @id @default(cuid())
  name             String
  industry         String?
  logo             String?
  contactName      String?
  contactEmail     String?
  maxWorkspaces    Int         @default(5)
  maxProjects      Int         @default(20)
  monthlyTokenQuota BigInt     @default(10000000)
  storageQuotaMB   Int         @default(10240)
  status           String      @default("active")
  workspaces       Workspace[]
  users            User[]
  modelConfigs     ModelConfig[]
  dimensions       DimensionConfig[]
  scenarioTags     ScenarioTag[]
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
}
model Workspace {
  id         String          @id @default(cuid())
  name       String
  tenantId   String
  tenant     Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  projects   Project[]
  members    WorkspaceUser[]
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt
}
model Project {
  id           String         @id @default(cuid())
  name         String
  type         String         @default("client")
  description  String?
  workspaceId  String
  workspace    Workspace      @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  ownerId      String
  owner        User           @relation("ProjectOwner", fields: [ownerId], references: [id])
  raws         Raw[]
  atoms        Atom[]
  qaPairs      QAPair[]
  blueprints   Blueprint[]
  workflowRuns WorkflowRun[]
  agents       Agent[]
  status       String         @default("active")
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}
model User {
  id            String          @id @default(cuid())
  email         String          @unique
  name          String
  passwordHash  String?
  avatar        String?
  role          UserRole        @default(READONLY)
  tenantId      String
  tenant        Tenant          @relation(fields: [tenantId], references: [id])
  workspaces    WorkspaceUser[]
  ownedProjects Project[]       @relation("ProjectOwner")
  reviewTasks   ReviewTask[]    @relation("ReviewAssignee")
  auditLogs     AuditLog[]
  lastLoginAt   DateTime?
  status        String          @default("active")
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
}
model WorkspaceUser {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  role        UserRole
  @@unique([userId, workspaceId])
}
// ============= Raw 素材库 (§13.1) =============
model Raw {
  id                 String           @id @default(cuid())
  title              String
  projectId          String
  project            Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  format             RawFormat
  materialType       MaterialType
  experienceSource   ExperienceSource
  originalFileUrl    String?
  originalFileName   String?
  markdownContent    String?
  conversionStatus   ConversionStatus @default(PENDING)
  verificationStatus String           @default("unverified")
  exposureLevel      ExposureLevel    @default(INTERNAL)
  fileSize           Int?
  atoms              Atom[]
  qaPairs            QAPair[]
  metadata           Json?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt
  @@index([projectId, conversionStatus])
}
// ============= Atoms 原子块库 (§13.2) =============
model Atom {
  id               String           @id @default(cuid())
  title            String
  content          String
  projectId        String
  project          Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  rawId            String?
  raw              Raw?             @relation(fields: [rawId], references: [id])
  layer            Layer
  granularity      Granularity      @default(ATOM)
  dimensions       Int[]            // 维度 1-30
  slotMappings     String[]         // S0.1, S1.2 等
  experienceSource ExperienceSource
  exposureLevel    ExposureLevel    @default(INTERNAL)
  scenarios        Json?            // { positions, platforms, audiences, businessLines }
  status           AssetStatus      @default(DRAFT)
  version          Int              @default(1)
  activeVersion    Int              @default(1)
  wordCount        Int?
  tokenEstimate    Int?
  blueprints       AtomBlueprint[]
  qaPairs          AtomQAPair[]
  parentAtomId     String?
  parentAtom       Atom?            @relation("AtomHierarchy", fields: [parentAtomId], references: [id])
  childAtoms       Atom[]           @relation("AtomHierarchy")
  validUntil       DateTime?
  metadata         Json?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
  @@index([projectId, status, layer])
  @@index([dimensions(ops: ArrayOps)])
}
// ============= QA Pairs 库 (§13.4) =============
model QAPair {
  id                String        @id @default(cuid())
  question          String
  answer            String
  projectId         String
  project           Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  rawId             String?
  raw               Raw?          @relation(fields: [rawId], references: [id])
  tags              String[]
  difficulty        QADifficulty  @default(BEGINNER)
  scenarios         String[]
  questionKeywords  String[]
  materialType      MaterialType
  status            AssetStatus   @default(DRAFT)
  version           Int           @default(1)
  answerWordCount   Int?
  qualityScore      Float?
  redlineResults    Json?
  specialMarks      Json?
  atoms             AtomQAPair[]
  metadata          Json?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  @@index([projectId, status])
}
// ============= Blueprint 蓝图库 (§13.3) =============
model Blueprint {
  id                 String           @id @default(cuid())
  name               String
  projectId          String
  project            Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  enterprise         String?
  position           String?
  taskName           String?
  workflowMode       WorkflowMode     @default(DAG)
  status             BlueprintStatus  @default(CONFIGURING)
  version            Int              @default(1)
  activeVersion      Int              @default(1)
  slotConfigs        SlotConfig[]
  atoms              AtomBlueprint[]
  workflowRuns       WorkflowRun[]
  agentBindings      AgentBlueprint[]
  scenarioTags       Json?
  totalTokenEstimate Int?
  qualityPassRate    Float?
  lastTestTime       DateTime?
  responsibleId      String?
  metadata           Json?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt
  @@index([projectId, status])
}
model SlotConfig {
  id               String      @id @default(cuid())
  blueprintId      String
  blueprint        Blueprint   @relation(fields: [blueprintId], references: [id], onDelete: Cascade)
  slotKey          String      // S0–S10
  subSlotKey       String?     // Sx.y
  order            Int
  fetchRules       FetchRule[]
  maxTokens        Int?
  conflictPriority String[]    @default(["D","C","B","A"])
  dedupe           Boolean     @default(true)
  fallbackStrategy String      @default("skip")
  assembledContent String?
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
  @@unique([blueprintId, slotKey, subSlotKey])
}
model FetchRule {
  id           String     @id @default(cuid())
  slotConfigId String
  slotConfig   SlotConfig @relation(fields: [slotConfigId], references: [id], onDelete: Cascade)
  layers       Layer[]
  dimensions   Int[]
  subSlots     String[]
  topN         Int        @default(5)
  priority     Int        @default(0)
  createdAt    DateTime   @default(now())
}
// ============= 关联表 =============
model AtomBlueprint {
  atomId      String
  atom        Atom      @relation(fields: [atomId], references: [id], onDelete: Cascade)
  blueprintId String
  blueprint   Blueprint @relation(fields: [blueprintId], references: [id], onDelete: Cascade)
  slotKey     String?
  order       Int       @default(0)
  @@id([atomId, blueprintId])
}
model AtomQAPair {
  atomId   String
  atom     Atom   @relation(fields: [atomId], references: [id], onDelete: Cascade)
  qaPairId String
  qaPair   QAPair @relation(fields: [qaPairId], references: [id], onDelete: Cascade)
  @@id([atomId, qaPairId])
}
// ============= Runtime (§13.7) =============
model Agent {
  id          String           @id @default(cuid())
  name        String
  description String?
  projectId   String
  project     Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  blueprints  AgentBlueprint[]
  tools       Json?
  status      String           @default("offline")
  totalRuns   Int              @default(0)
  successRate Float?
  avgDuration Float?
  avgTokens   Float?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}
model AgentBlueprint {
  agentId     String
  agent       Agent     @relation(fields: [agentId], references: [id], onDelete: Cascade)
  blueprintId String
  blueprint   Blueprint @relation(fields: [blueprintId], references: [id], onDelete: Cascade)
  @@id([agentId, blueprintId])
}
model WorkflowRun {
  id                 String             @id @default(cuid())
  blueprintId        String
  blueprint          Blueprint          @relation(fields: [blueprintId], references: [id])
  projectId          String
  project            Project            @relation(fields: [projectId], references: [id])
  blueprintVersion   Int
  workflowMode       WorkflowMode
  status             RunStatus          @default(RUNNING)
  inputData          Json?
  outputContent      String?
  tokenUsage         Int?
  duration           Float?
  cost               Float?
  traceId            String?
  atomVersionSnapshot  Json?
  qaVersionSnapshot    Json?
  contentPerformance Json?
  roiMetrics         Json?
  conversionOutcome  Json?
  evaluations        EvaluationRecord[]
  reviewTasks        ReviewTask[]
  incidents          Incident[]
  nodeTraces         Json?
  startedAt          DateTime           @default(now())
  completedAt        DateTime?
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
  @@index([projectId, status])
  @@index([blueprintId])
}
model EvaluationRecord {
  id              String      @id @default(cuid())
  workflowRunId   String
  workflowRun     WorkflowRun @relation(fields: [workflowRunId], references: [id], onDelete: Cascade)
  s8Scores        Json?
  s9OverallScore  Float?
  s9Dimensions    Json?
  redlineScanResults Json?
  passed          Boolean     @default(false)
  createdAt       DateTime    @default(now())
}
model ReviewTask {
  id              String       @id @default(cuid())
  workflowRunId   String
  workflowRun     WorkflowRun  @relation(fields: [workflowRunId], references: [id], onDelete: Cascade)
  triggerReason   String
  urgency         Urgency      @default(YELLOW)
  assigneeId      String?
  assignee        User?        @relation("ReviewAssignee", fields: [assigneeId], references: [id])
  status          ReviewStatus @default(PENDING)
  result          String?
  modifiedOutput  String?
  feedback        String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}
model Incident {
  id            String           @id @default(cuid())
  workflowRunId String?
  workflowRun   WorkflowRun?     @relation(fields: [workflowRunId], references: [id])
  type          String
  severity      IncidentSeverity
  description   String?
  rootCause     String?
  resolution    String?
  status        String           @default("pending")
  traceId       String?
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
}
// ============= Admin & Config =============
model AuditLog {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  action        String
  entityType    String
  entityId      String
  entityName    String?
  changeSummary String?
  diff          Json?
  traceId       String?
  severity      String   @default("info")
  createdAt     DateTime @default(now())
  @@index([entityType, entityId])
  @@index([userId, createdAt])
}
model ModelConfig {
  id            String  @id @default(cuid())
  scene         String
  defaultModel  String
  fallbackModel String?
  temperature   Float
  maxTokens     Int?
  tenantId      String?
  tenant        Tenant? @relation(fields: [tenantId], references: [id])
  costPerMToken Float?
  status        String  @default("active")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@unique([scene, tenantId])
}
model DimensionConfig {
  id          String  @id @default(cuid())
  number      Int
  name        String
  description String?
  layer       Layer
  tenantId    String?
  tenant      Tenant? @relation(fields: [tenantId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@unique([number, tenantId])
}
model ScenarioTag {
  id       String  @id @default(cuid())
  type     String  // position | platform | audience | business_line
  name     String
  tenantId String?
  tenant   Tenant? @relation(fields: [tenantId], references: [id])
  status   String  @default("active")
  createdAt DateTime @default(now())
  @@unique([type, name, tenantId])
}
model BasePack {
  id         String  @id @default(cuid())
  slotKey    String
  subSlotKey String?
  content    String
  scope      String  @default("global")
  scopeValue String?
  version    Int     @default(1)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@unique([slotKey, subSlotKey, scope, scopeValue])
}
```

### prisma/seed.ts

```tsx
import { PrismaClient, Layer, UserRole } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  // 1. 创建默认租户
  const tenant = await prisma.tenant.create({
    data: { name: "Demo 企业", industry: "互联网", contactEmail: "admin@demo.com" },
  });
  // 2. 创建 Workspace
  const ws = await prisma.workspace.create({
    data: { name: "默认工作空间", tenantId: tenant.id },
  });
  // 3. 创建超级管理员
  const admin = await prisma.user.create({
    data: {
      email: "admin@demo.com", name: "超级管理员",
      role: UserRole.SUPER_ADMIN, tenantId: tenant.id,
    },
  });
  await prisma.workspaceUser.create({
    data: { userId: admin.id, workspaceId: ws.id, role: UserRole.SUPER_ADMIN },
  });
  // 4. 创建示例 Project
  const project = await prisma.project.create({
    data: { name: "示例项目", workspaceId: ws.id, ownerId: admin.id },
  });
  // 5. 预置 30 维度
  const dimDefs: { n: number; name: string; layer: Layer }[] = [
    { n: 1, name: "行业认知", layer: Layer.A }, { n: 2, name: "产品知识", layer: Layer.A },
    { n: 3, name: "用户画像", layer: Layer.A }, { n: 4, name: "竞品分析", layer: Layer.A },
    { n: 5, name: "市场趋势", layer: Layer.A }, { n: 6, name: "数据分析", layer: Layer.B },
    { n: 7, name: "文案写作", layer: Layer.B }, { n: 8, name: "投放策略", layer: Layer.B },
    { n: 9, name: "客户沟通", layer: Layer.B }, { n: 10, name: "项目管理", layer: Layer.B },
    { n: 11, name: "SEO 优化", layer: Layer.B }, { n: 12, name: "社交媒体运营", layer: Layer.B },
    { n: 13, name: "视频脚本", layer: Layer.B }, { n: 14, name: "活动策划", layer: Layer.B },
    { n: 15, name: "渠道管理", layer: Layer.B }, { n: 16, name: "品牌调性", layer: Layer.C },
    { n: 17, name: "语言风格", layer: Layer.C }, { n: 18, name: "敏感词库", layer: Layer.C },
    { n: 19, name: "红线规避", layer: Layer.C }, { n: 20, name: "竞品提及规则", layer: Layer.C },
    { n: 21, name: "合规审查", layer: Layer.D }, { n: 22, name: "法律条款", layer: Layer.D },
    { n: 23, name: "隐私政策", layer: Layer.D }, { n: 24, name: "广告法合规", layer: Layer.D },
    { n: 25, name: "行业监管", layer: Layer.D }, { n: 26, name: "数据安全", layer: Layer.D },
    { n: 27, name: "知识产权", layer: Layer.D }, { n: 28, name: "跨境合规", layer: Layer.D },
    { n: 29, name: "用户协议", layer: Layer.D }, { n: 30, name: "内部制度", layer: Layer.D },
  ];
  await prisma.dimensionConfig.createMany({
    data: dimDefs.map(d => ({ number: d.n, name: d.name, layer: d.layer, tenantId: tenant.id })),
  });
  // 6. 预置模型网关温度矩阵 (§18)
  const modelDefs = [
    { scene: "routing",         defaultModel: "deepseek-v3",    temperature: 0.3 },
    { scene: "pre_check",       defaultModel: "gpt-4o-mini",    temperature: 0.3 },
    { scene: "main_creative",   defaultModel: "claude-3.5-sonnet", temperature: 0.75 },
    { scene: "main_analytical", defaultModel: "deepseek-v3",    temperature: 0.3 },
    { scene: "script",          defaultModel: "claude-3.5-sonnet", temperature: 0.5 },
    { scene: "evaluation",      defaultModel: "gpt-4o",         temperature: 0.2 },
    { scene: "planner",         defaultModel: "claude-3.5-sonnet", temperature: 0.3 },
  ];
  await prisma.modelConfig.createMany({
    data: modelDefs.map(m => ({ ...m, tenantId: tenant.id })),
  });
  // 7. 预置底座包 S0-S10
  const slots = ["S0","S1","S2","S3","S4","S5","S6","S7","S8","S9","S10"];
  await prisma.basePack.createMany({
    data: slots.map(s => ({ slotKey: s, content: `// ${s} 通用底座包模板\n请根据场景填充...`, scope: "global" })),
  });
  console.log("Seed completed!");
}
main().catch(console.error).finally(() => prisma.$disconnect());
```

---

## 3. 认证与 RBAC 权限

### src/lib/prisma.ts

```tsx
import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ["warn", "error"] });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### src/lib/auth.ts — NextAuth 配置

```tsx
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { compare } from "bcryptjs";
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { tenant: true },
        });
        if (!user?.passwordHash) return null;
        const valid = await compare(credentials.password as string, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.role = (user as any).role; token.tenantId = (user as any).tenantId; }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub!;
        (session.user as any).role = token.role;
        (session.user as any).tenantId = token.tenantId;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
});
```

### src/lib/rbac.ts — 权限矩阵

```tsx
import { UserRole } from "@prisma/client";
type Module = "knowledge" | "prompts" | "orchestration" | "governance" | "admin";
type Permission = "none" | "read" | "write" | "manage";
const PERMISSION_MATRIX: Record<UserRole, Record<Module, Permission>> = {
  SUPER_ADMIN:      { knowledge: "manage", prompts: "manage", orchestration: "manage", governance: "manage", admin: "manage" },
  TENANT_ADMIN:     { knowledge: "manage", prompts: "manage", orchestration: "manage", governance: "manage", admin: "manage" },
  KNOWLEDGE_EDITOR: { knowledge: "write",  prompts: "read",   orchestration: "none",   governance: "none",   admin: "none"   },
  PROMPT_ENGINEER:  { knowledge: "read",   prompts: "write",  orchestration: "write",  governance: "read",   admin: "none"   },
  OPERATOR:         { knowledge: "read",   prompts: "read",   orchestration: "write",  governance: "read",   admin: "none"   },
  REVIEWER:         { knowledge: "write",  prompts: "read",   orchestration: "write",  governance: "write",  admin: "none"   },
  READONLY:         { knowledge: "read",   prompts: "none",   orchestration: "read",   governance: "none",   admin: "none"   },
};
export function checkPermission(role: UserRole, module: Module, required: Permission): boolean {
  const levels: Permission[] = ["none", "read", "write", "manage"];
  const userLevel = levels.indexOf(PERMISSION_MATRIX[role][module]);
  const requiredLevel = levels.indexOf(required);
  return userLevel >= requiredLevel;
}
export function getModulePermission(role: UserRole, module: Module): Permission {
  return PERMISSION_MATRIX[role][module];
}
export function canAccessModule(role: UserRole, module: Module): boolean {
  return PERMISSION_MATRIX[role][module] !== "none";
}
```

### src/middleware.ts

```tsx
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
const PUBLIC_PATHS = ["/login", "/api/auth"];
export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next();
  if (!req.auth) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
});
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
```

---

## 4. tRPC API 层

### src/server/trpc.ts — 初始化 + Context

```tsx
import { initTRPC, TRPCError } from "@trpc/server";
import { type Session } from "next-auth";
import superjson from "superjson";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";
export type Context = { prisma: typeof prisma; session: Session | null };
export const createContext = async (session: Session | null): Promise<Context> => ({ prisma, session });
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return { ...shape, data: { ...shape.data, zodError: error.cause instanceof ZodError ? error.cause.flatten() : null } };
  },
});
export const router = t.router;
export const publicProcedure = t.procedure;
const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user: ctx.session.user as any } });
});
export const protectedProcedure = t.procedure.use(enforceAuth);
export const withPermission = (module: string, required: string) =>
  protectedProcedure.use(({ ctx, next }) => {
    if (!checkPermission(ctx.user.role as UserRole, module as any, required as any))
      throw new TRPCError({ code: "FORBIDDEN", message: `需要 ${module} 的 ${required} 权限` });
    return next({ ctx });
  });
```

### src/server/routers/_app.ts — 根路由

```tsx
import { router } from "../trpc";
import { rawRouter } from "./raw";
import { atomRouter } from "./atom";
import { qaPairRouter } from "./qaPair";
import { blueprintRouter } from "./blueprint";
import { workflowRunRouter } from "./workflowRun";
import { agentRouter } from "./agent";
import { tenantRouter } from "./tenant";
import { projectRouter } from "./project";
import { userRouter } from "./user";
import { auditLogRouter } from "./auditLog";
import { modelConfigRouter } from "./modelConfig";
import { taxonomyRouter } from "./taxonomy";
import { basePackRouter } from "./basePack";
import { analyticsRouter } from "./analytics";
import { vectorRouter } from "./vector";
import { reviewRouter } from "./review";
import { evaluationRouter } from "./evaluation";
export const appRouter = router({
  raw: rawRouter,
  atom: atomRouter,
  qaPair: qaPairRouter,
  blueprint: blueprintRouter,
  workflowRun: workflowRunRouter,
  agent: agentRouter,
  tenant: tenantRouter,
  project: projectRouter,
  user: userRouter,
  auditLog: auditLogRouter,
  modelConfig: modelConfigRouter,
  taxonomy: taxonomyRouter,
  basePack: basePackRouter,
  analytics: analyticsRouter,
  vector: vectorRouter,
  review: reviewRouter,
  evaluation: evaluationRouter,
});
export type AppRouter = typeof appRouter;
```

### src/server/routers/raw.ts — Raw 素材 CRUD

```tsx
import { z } from "zod";
import { router, withPermission } from "../trpc";
export const rawRouter = router({
  list: withPermission("knowledge", "read")
    .input(z.object({
      projectId: z.string(),
      format: z.string().optional(),
      conversionStatus: z.string().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { projectId: input.projectId };
      if (input.format) where.format = input.format;
      if (input.conversionStatus) where.conversionStatus = input.conversionStatus;
      if (input.search) where.title = { contains: input.search, mode: "insensitive" };
      const [items, total] = await Promise.all([
        ctx.prisma.raw.findMany({ where, skip: (input.page - 1) * input.pageSize, take: input.pageSize, orderBy: { createdAt: "desc" }, include: { _count: { select: { atoms: true, qaPairs: true } } } }),
        ctx.prisma.raw.count({ where }),
      ]);
      return { items, total, totalPages: Math.ceil(total / input.pageSize) };
    }),
  getById: withPermission("knowledge", "read")
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.raw.findUniqueOrThrow({ where: { id: input.id }, include: { atoms: { take: 50 }, qaPairs: { take: 50 } } })
    ),
  create: withPermission("knowledge", "write")
    .input(z.object({
      title: z.string(), projectId: z.string(), format: z.string(), materialType: z.string(),
      experienceSource: z.string(), originalFileUrl: z.string().optional(), exposureLevel: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const raw = await ctx.prisma.raw.create({ data: input as any });
      await ctx.prisma.auditLog.create({ data: { userId: ctx.user.id, action: "create", entityType: "raw", entityId: raw.id, entityName: raw.title } });
      return raw;
    }),
  update: withPermission("knowledge", "write")
    .input(z.object({ id: z.string(), data: z.record(z.unknown()) }))
    .mutation(async ({ ctx, input }) => {
      const raw = await ctx.prisma.raw.update({ where: { id: input.id }, data: input.data as any });
      await ctx.prisma.auditLog.create({ data: { userId: ctx.user.id, action: "update", entityType: "raw", entityId: raw.id, entityName: raw.title } });
      return raw;
    }),
  delete: withPermission("knowledge", "manage")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.raw.delete({ where: { id: input.id } });
      await ctx.prisma.auditLog.create({ data: { userId: ctx.user.id, action: "delete", entityType: "raw", entityId: input.id } });
    }),
  startConversion: withPermission("knowledge", "write")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.raw.update({ where: { id: input.id }, data: { conversionStatus: "CONVERTING" } });
      // TODO: 触发格式归一引擎异步任务
      return { success: true, message: "转换任务已提交" };
    }),
});
```

### src/server/routers/atom.ts — Atoms 原子块 CRUD

```tsx
import { z } from "zod";
import { router, withPermission } from "../trpc";
export const atomRouter = router({
  list: withPermission("knowledge", "read")
    .input(z.object({
      projectId: z.string(),
      status: z.string().optional(),
      layer: z.string().optional(),
      granularity: z.string().optional(),
      dimensions: z.array(z.number()).optional(),
      slotMapping: z.string().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { projectId: input.projectId };
      if (input.status) where.status = input.status;
      if (input.layer) where.layer = input.layer;
      if (input.granularity) where.granularity = input.granularity;
      if (input.dimensions?.length) where.dimensions = { hasSome: input.dimensions };
      if (input.slotMapping) where.slotMappings = { has: input.slotMapping };
      if (input.search) where.OR = [{ title: { contains: input.search, mode: "insensitive" } }, { content: { contains: input.search, mode: "insensitive" } }];
      const [items, total] = await Promise.all([
        ctx.prisma.atom.findMany({ where, skip: (input.page - 1) * input.pageSize, take: input.pageSize, orderBy: { updatedAt: "desc" }, include: { _count: { select: { blueprints: true, qaPairs: true } } } }),
        ctx.prisma.atom.count({ where }),
      ]);
      return { items, total, totalPages: Math.ceil(total / input.pageSize) };
    }),
  getById: withPermission("knowledge", "read")
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.atom.findUniqueOrThrow({ where: { id: input.id }, include: { raw: true, blueprints: { include: { blueprint: true } }, qaPairs: { include: { qaPair: true } }, childAtoms: true } })
    ),
  create: withPermission("knowledge", "write")
    .input(z.object({
      title: z.string(), content: z.string(), projectId: z.string(), rawId: z.string().optional(),
      layer: z.string(), granularity: z.string().optional(), dimensions: z.array(z.number()),
      slotMappings: z.array(z.string()), experienceSource: z.string(), exposureLevel: z.string().optional(),
      scenarios: z.any().optional(), wordCount: z.number().optional(), tokenEstimate: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const atom = await ctx.prisma.atom.create({ data: input as any });
      await ctx.prisma.auditLog.create({ data: { userId: ctx.user.id, action: "create", entityType: "atom", entityId: atom.id, entityName: atom.title } });
      return atom;
    }),
  update: withPermission("knowledge", "write")
    .input(z.object({ id: z.string(), data: z.record(z.unknown()) }))
    .mutation(async ({ ctx, input }) => {
      const atom = await ctx.prisma.atom.update({ where: { id: input.id }, data: { ...(input.data as any), version: { increment: 1 } } });
      await ctx.prisma.auditLog.create({ data: { userId: ctx.user.id, action: "update", entityType: "atom", entityId: atom.id, entityName: atom.title } });
      return atom;
    }),
  // 维度×层级矩阵统计 (KC-06 视图 3)
  dimensionLayerMatrix: withPermission("knowledge", "read")
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const atoms = await ctx.prisma.atom.findMany({ where: { projectId: input.projectId, status: "ACTIVE" }, select: { dimensions: true, layer: true } });
      const matrix: Record<string, Record<string, number>> = {};
      for (let d = 1; d <= 30; d++) { matrix[d] = { A: 0, B: 0, C: 0, D: 0 }; }
      atoms.forEach(a => a.dimensions.forEach(d => { if (matrix[d]) matrix[d][a.layer]++; }));
      return matrix;
    }),
  // 孤儿原子块 (KC-06 视图 4)
  orphans: withPermission("knowledge", "read")
    .input(z.object({ projectId: z.string(), page: z.number().default(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.atom.findMany({ where: { projectId: input.projectId, blueprints: { none: {} } }, take: 50, skip: (input.page - 1) * 50, orderBy: { createdAt: "desc" } });
    }),
  // 高频引用 (KC-06 视图 5)
  hotAtoms: withPermission("knowledge", "read")
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.atom.findMany({ where: { projectId: input.projectId, status: "ACTIVE" }, include: { _count: { select: { blueprints: true } } }, orderBy: { blueprints: { _count: "desc" } }, take: 50 });
    }),
});
```

### src/server/routers/qaPair.ts

```tsx
import { z } from "zod";
import { router, withPermission } from "../trpc";
export const qaPairRouter = router({
  list: withPermission("knowledge", "read")
    .input(z.object({
      projectId: z.string(), difficulty: z.string().optional(), materialType: z.string().optional(),
      status: z.string().optional(), search: z.string().optional(),
      page: z.number().default(1), pageSize: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { projectId: input.projectId };
      if (input.difficulty) where.difficulty = input.difficulty;
      if (input.status) where.status = input.status;
      if (input.search) where.OR = [{ question: { contains: input.search, mode: "insensitive" } }, { answer: { contains: input.search, mode: "insensitive" } }];
      const [items, total] = await Promise.all([
        ctx.prisma.qAPair.findMany({ where, skip: (input.page - 1) * input.pageSize, take: input.pageSize, orderBy: { updatedAt: "desc" }, include: { _count: { select: { atoms: true } } } }),
        ctx.prisma.qAPair.count({ where }),
      ]);
      return { items, total, totalPages: Math.ceil(total / input.pageSize) };
    }),
  getById: withPermission("knowledge", "read")
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.qAPair.findUniqueOrThrow({ where: { id: input.id }, include: { raw: true, atoms: { include: { atom: true } } } })
    ),
  create: withPermission("knowledge", "write")
    .input(z.object({
      question: z.string(), answer: z.string(), projectId: z.string(), rawId: z.string().optional(),
      tags: z.array(z.string()), difficulty: z.string(), scenarios: z.array(z.string()),
      questionKeywords: z.array(z.string()), materialType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const qa = await ctx.prisma.qAPair.create({ data: input as any });
      await ctx.prisma.auditLog.create({ data: { userId: ctx.user.id, action: "create", entityType: "qa_pair", entityId: qa.id, entityName: qa.question.substring(0, 50) } });
      return qa;
    }),
  // RAG 检索测试 (KC-04 / KC-07)
  searchSimilar: withPermission("knowledge", "read")
    .input(z.object({ projectId: z.string(), question: z.string(), topN: z.number().default(5) }))
    .query(async ({ ctx, input }) => {
      // TODO: 调用向量检索服务
      // 临时使用关键词搜索
      return ctx.prisma.qAPair.findMany({
        where: { projectId: input.projectId, question: { contains: input.question, mode: "insensitive" } },
        take: input.topN, orderBy: { qualityScore: "desc" },
      });
    }),
});
```

### src/server/routers/blueprint.ts — 蓝图 CRUD + 装配

```tsx
import { z } from "zod";
import { router, withPermission } from "../trpc";
export const blueprintRouter = router({
  list: withPermission("prompts", "read")
    .input(z.object({
      projectId: z.string(), status: z.string().optional(), search: z.string().optional(),
      page: z.number().default(1), pageSize: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { projectId: input.projectId };
      if (input.status) where.status = input.status;
      if (input.search) where.name = { contains: input.search, mode: "insensitive" };
      const [items, total] = await Promise.all([
        ctx.prisma.blueprint.findMany({ where, skip: (input.page - 1) * input.pageSize, take: input.pageSize, orderBy: { updatedAt: "desc" }, include: { _count: { select: { atoms: true, workflowRuns: true } }, slotConfigs: { orderBy: { order: "asc" } } } }),
        ctx.prisma.blueprint.count({ where }),
      ]);
      return { items, total, totalPages: Math.ceil(total / input.pageSize) };
    }),
  getById: withPermission("prompts", "read")
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.blueprint.findUniqueOrThrow({ where: { id: input.id }, include: { slotConfigs: { orderBy: { order: "asc" }, include: { fetchRules: true } }, atoms: { include: { atom: true } } } })
    ),
  create: withPermission("prompts", "write")
    .input(z.object({
      name: z.string(), projectId: z.string(), enterprise: z.string().optional(),
      position: z.string().optional(), taskName: z.string().optional(),
      workflowMode: z.string().default("DAG"),
    }))
    .mutation(async ({ ctx, input }) => {
      const bp = await ctx.prisma.blueprint.create({ data: input as any });
      // 自动创建 S0-S10 的 SlotConfig
      const slots = ["S0","S1","S2","S3","S4","S6","S5","S10","S7","S8","S9"];
      await ctx.prisma.slotConfig.createMany({
        data: slots.map((s, i) => ({ blueprintId: bp.id, slotKey: s, order: i })),
      });
      await ctx.prisma.auditLog.create({ data: { userId: ctx.user.id, action: "create", entityType: "blueprint", entityId: bp.id, entityName: bp.name } });
      return bp;
    }),
  updateSlotConfig: withPermission("prompts", "write")
    .input(z.object({
      slotConfigId: z.string(),
      maxTokens: z.number().optional(),
      conflictPriority: z.array(z.string()).optional(),
      dedupe: z.boolean().optional(),
      fallbackStrategy: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { slotConfigId, ...data } = input;
      return ctx.prisma.slotConfig.update({ where: { id: slotConfigId }, data });
    }),
  // 从库选料 — 根据槽位推荐原子块
  recommendAtoms: withPermission("prompts", "read")
    .input(z.object({ blueprintId: z.string(), slotKey: z.string(), topN: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      const bp = await ctx.prisma.blueprint.findUniqueOrThrow({ where: { id: input.blueprintId } });
      return ctx.prisma.atom.findMany({
        where: { projectId: bp.projectId, status: "ACTIVE", slotMappings: { has: input.slotKey } },
        take: input.topN, orderBy: { updatedAt: "desc" },
        include: { _count: { select: { blueprints: true } } },
      });
    }),
  // 装配预览 — 拼装 System Prompt
  assemblePreview: withPermission("prompts", "read")
    .input(z.object({ blueprintId: z.string() }))
    .query(async ({ ctx, input }) => {
      const bp = await ctx.prisma.blueprint.findUniqueOrThrow({
        where: { id: input.blueprintId },
        include: { slotConfigs: { orderBy: { order: "asc" } }, atoms: { include: { atom: true } } },
      });
      let prompt = "";
      let totalTokens = 0;
      const slotStats: { slot: string; tokens: number; atomCount: number }[] = [];
      for (const sc of bp.slotConfigs) {
        const slotAtoms = bp.atoms.filter(a => a.slotKey === sc.slotKey).map(a => a.atom);
        const content = slotAtoms.map(a => a.content).join("\n\n");
        const tokens = Math.ceil(content.length / 2); // 粗估
        prompt += `\n<!-- ${sc.slotKey} -->\n${content}\n`;
        totalTokens += tokens;
        slotStats.push({ slot: sc.slotKey, tokens, atomCount: slotAtoms.length });
      }
      return { prompt, totalTokens, slotStats };
    }),
  // 状态流转
  updateStatus: withPermission("prompts", "write")
    .input(z.object({ id: z.string(), status: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const bp = await ctx.prisma.blueprint.update({ where: { id: input.id }, data: { status: input.status as any, version: input.status === "ONLINE" ? { increment: 1 } : undefined } });
      await ctx.prisma.auditLog.create({ data: { userId: ctx.user.id, action: "update", entityType: "blueprint", entityId: bp.id, entityName: bp.name, changeSummary: `状态变更为 ${input.status}` } });
      return bp;
    }),
});
```

### src/server/routers/workflowRun.ts — 运行记录

```tsx
import { z } from "zod";
import { router, withPermission } from "../trpc";
export const workflowRunRouter = router({
  list: withPermission("orchestration", "read")
    .input(z.object({
      projectId: z.string(), status: z.string().optional(), blueprintId: z.string().optional(),
      page: z.number().default(1), pageSize: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { projectId: input.projectId };
      if (input.status) where.status = input.status;
      if (input.blueprintId) where.blueprintId = input.blueprintId;
      const [items, total] = await Promise.all([
        ctx.prisma.workflowRun.findMany({ where, skip: (input.page - 1) * input.pageSize, take: input.pageSize, orderBy: { startedAt: "desc" }, include: { blueprint: { select: { name: true, version: true } } } }),
        ctx.prisma.workflowRun.count({ where }),
      ]);
      return { items, total, totalPages: Math.ceil(total / input.pageSize) };
    }),
  getById: withPermission("orchestration", "read")
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.workflowRun.findUniqueOrThrow({ where: { id: input.id }, include: { blueprint: true, evaluations: true, reviewTasks: { include: { assignee: true } }, incidents: true } })
    ),
  // 今日统计 (OC-03 顶部卡片)
  todayStats: withPermission("orchestration", "read")
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const runs = await ctx.prisma.workflowRun.findMany({ where: { projectId: input.projectId, startedAt: { gte: today } } });
      const total = runs.length;
      const success = runs.filter(r => r.status === "SUCCESS").length;
      const totalTokens = runs.reduce((s, r) => s + (r.tokenUsage ?? 0), 0);
      const totalCost = runs.reduce((s, r) => s + (r.cost ?? 0), 0);
      const avgDuration = total ? runs.reduce((s, r) => s + (r.duration ?? 0), 0) / total : 0;
      return { total, successRate: total ? success / total : 0, avgDuration, totalTokens, totalCost };
    }),
});
```

### src/server/routers/review.ts — HITL 审核

```tsx
import { z } from "zod";
import { router, withPermission } from "../trpc";
export const reviewRouter = router({
  queue: withPermission("orchestration", "read")
    .input(z.object({ projectId: z.string(), status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.reviewTask.findMany({
        where: { workflowRun: { projectId: input.projectId }, ...(input.status ? { status: input.status as any } : {}) },
        orderBy: [{ urgency: "asc" }, { createdAt: "asc" }],
        include: { workflowRun: { include: { blueprint: { select: { name: true } } } }, assignee: true },
        take: 100,
      });
    }),
  resolve: withPermission("orchestration", "write")
    .input(z.object({
      id: z.string(), status: z.string(), // APPROVED | MODIFIED_APPROVED | REJECTED | ESCALATED
      modifiedOutput: z.string().optional(), feedback: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.reviewTask.update({ where: { id: input.id }, data: { status: input.status as any, modifiedOutput: input.modifiedOutput, feedback: input.feedback, assigneeId: ctx.user.id } });
      await ctx.prisma.auditLog.create({ data: { userId: ctx.user.id, action: "review", entityType: "review_task", entityId: task.id, changeSummary: `审核结果: ${input.status}` } });
      return task;
    }),
});
```

### src/server/routers/project.ts

```tsx
import { z } from "zod";
import { router, withPermission } from "../trpc";
export const projectRouter = router({
  list: withPermission("admin", "read")
    .input(z.object({ workspaceId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.project.findMany({ where: { workspaceId: input.workspaceId }, include: { owner: { select: { name: true } }, _count: { select: { raws: true, atoms: true, qaPairs: true, blueprints: true, workflowRuns: true } } }, orderBy: { updatedAt: "desc" } })
    ),
  getById: withPermission("admin", "read")
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.project.findUniqueOrThrow({ where: { id: input.id }, include: { owner: true, _count: { select: { raws: true, atoms: true, qaPairs: true, blueprints: true, workflowRuns: true } } } })
    ),
  create: withPermission("admin", "write")
    .input(z.object({ name: z.string(), workspaceId: z.string(), type: z.string().optional(), description: z.string().optional() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.project.create({ data: { ...input, ownerId: ctx.user.id } })
    ),
  assetOverview: withPermission("admin", "read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [rawCount, atomStats, qaCount, bpStats, runStats] = await Promise.all([
        ctx.prisma.raw.count({ where: { projectId: input.id } }),
        ctx.prisma.atom.groupBy({ by: ["granularity"], where: { projectId: input.id }, _count: true }),
        ctx.prisma.qAPair.count({ where: { projectId: input.id } }),
        ctx.prisma.blueprint.groupBy({ by: ["status"], where: { projectId: input.id }, _count: true }),
        ctx.prisma.workflowRun.aggregate({ where: { projectId: input.id }, _count: true, _avg: { tokenUsage: true } }),
      ]);
      return { rawCount, atomStats, qaCount, bpStats, runStats };
    }),
});
```

### src/server/routers/tenant.ts · user.ts · auditLog.ts · modelConfig.ts · taxonomy.ts · basePack.ts · analytics.ts · evaluation.ts · agent.ts（模式一致，简述）

```tsx
// ===== tenant.ts =====
import { z } from "zod";
import { router, withPermission } from "../trpc";
export const tenantRouter = router({
  list: withPermission("admin", "manage").query(({ ctx }) => ctx.prisma.tenant.findMany({ include: { _count: { select: { workspaces: true, users: true } } } })),
  getById: withPermission("admin", "read").input(z.object({ id: z.string() })).query(({ ctx, input }) => ctx.prisma.tenant.findUniqueOrThrow({ where: { id: input.id }, include: { workspaces: true } })),
  update: withPermission("admin", "manage").input(z.object({ id: z.string(), data: z.record(z.unknown()) })).mutation(({ ctx, input }) => ctx.prisma.tenant.update({ where: { id: input.id }, data: input.data as any })),
});
// ===== user.ts =====
export const userRouter = router({
  list: withPermission("admin", "read").input(z.object({ tenantId: z.string().optional() })).query(({ ctx, input }) => ctx.prisma.user.findMany({ where: input.tenantId ? { tenantId: input.tenantId } : {}, include: { tenant: { select: { name: true } } }, orderBy: { createdAt: "desc" } })),
  updateRole: withPermission("admin", "manage").input(z.object({ userId: z.string(), role: z.string() })).mutation(({ ctx, input }) => ctx.prisma.user.update({ where: { id: input.userId }, data: { role: input.role as any } })),
});
// ===== auditLog.ts =====
export const auditLogRouter = router({
  list: withPermission("governance", "read").input(z.object({ entityType: z.string().optional(), userId: z.string().optional(), from: z.string().optional(), to: z.string().optional(), page: z.number().default(1) })).query(async ({ ctx, input }) => {
    const where: any = {};
    if (input.entityType) where.entityType = input.entityType;
    if (input.userId) where.userId = input.userId;
    if (input.from) where.createdAt = { gte: new Date(input.from) };
    const [items, total] = await Promise.all([ctx.prisma.auditLog.findMany({ where, skip: (input.page - 1) * 50, take: 50, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } }), ctx.prisma.auditLog.count({ where })]);
    return { items, total };
  }),
});
// ===== modelConfig.ts =====
export const modelConfigRouter = router({
  list: withPermission("governance", "read").input(z.object({ tenantId: z.string().optional() })).query(({ ctx, input }) => ctx.prisma.modelConfig.findMany({ where: input.tenantId ? { tenantId: input.tenantId } : {} })),
  update: withPermission("governance", "manage").input(z.object({ id: z.string(), data: z.record(z.unknown()) })).mutation(({ ctx, input }) => ctx.prisma.modelConfig.update({ where: { id: input.id }, data: input.data as any })),
});
// ===== taxonomy.ts =====
export const taxonomyRouter = router({
  dimensions: withPermission("knowledge", "read").input(z.object({ tenantId: z.string().optional() })).query(({ ctx, input }) => ctx.prisma.dimensionConfig.findMany({ where: input.tenantId ? { tenantId: input.tenantId } : {}, orderBy: { number: "asc" } })),
  scenarioTags: withPermission("knowledge", "read").input(z.object({ type: z.string().optional() })).query(({ ctx, input }) => ctx.prisma.scenarioTag.findMany({ where: input.type ? { type: input.type } : {}, orderBy: { name: "asc" } })),
  createTag: withPermission("knowledge", "write").input(z.object({ type: z.string(), name: z.string() })).mutation(({ ctx, input }) => ctx.prisma.scenarioTag.create({ data: input })),
});
// ===== basePack.ts =====
export const basePackRouter = router({
  list: withPermission("prompts", "read").query(({ ctx }) => ctx.prisma.basePack.findMany({ orderBy: { slotKey: "asc" } })),
  update: withPermission("prompts", "write").input(z.object({ id: z.string(), content: z.string() })).mutation(({ ctx, input }) => ctx.prisma.basePack.update({ where: { id: input.id }, data: { content: input.content, version: { increment: 1 } } })),
});
// ===== analytics.ts =====
export const analyticsRouter = router({
  runTrend: withPermission("governance", "read").input(z.object({ projectId: z.string(), days: z.number().default(30) })).query(async ({ ctx, input }) => {
    const since = new Date(); since.setDate(since.getDate() - input.days);
    const runs = await ctx.prisma.workflowRun.findMany({ where: { projectId: input.projectId, startedAt: { gte: since } }, select: { status: true, startedAt: true, tokenUsage: true, cost: true } });
    return runs; // 前端做分组聚合
  }),
  qualityTrend: withPermission("governance", "read").input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
    return ctx.prisma.evaluationRecord.findMany({ where: { workflowRun: { projectId: input.projectId } }, orderBy: { createdAt: "desc" }, take: 200, select: { s9OverallScore: true, passed: true, createdAt: true } });
  }),
  incidentList: withPermission("governance", "read").input(z.object({ status: z.string().optional() })).query(({ ctx, input }) => ctx.prisma.incident.findMany({ where: input.status ? { status: input.status } : {}, orderBy: { createdAt: "desc" }, take: 100 })),
  slaMetrics: withPermission("governance", "read").input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
    // 聚合 SLA 相关指标
    const runs = await ctx.prisma.workflowRun.findMany({ where: { projectId: input.projectId, startedAt: { gte: new Date(Date.now() - 7 * 86400000) } }, select: { status: true, duration: true, tokenUsage: true, nodeTraces: true } });
    return { totalRuns: runs.length, avgDuration: runs.reduce((s, r) => s + (r.duration ?? 0), 0) / (runs.length || 1), successRate: runs.filter(r => r.status === "SUCCESS").length / (runs.length || 1) };
  }),
});
// ===== evaluation.ts =====
export const evaluationRouter = router({
  listByBlueprint: withPermission("prompts", "read").input(z.object({ blueprintId: z.string() })).query(({ ctx, input }) => ctx.prisma.evaluationRecord.findMany({ where: { workflowRun: { blueprintId: input.blueprintId } }, orderBy: { createdAt: "desc" }, take: 50 })),
});
// ===== agent.ts =====
export const agentRouter = router({
  list: withPermission("orchestration", "read").input(z.object({ projectId: z.string() })).query(({ ctx, input }) => ctx.prisma.agent.findMany({ where: { projectId: input.projectId }, include: { blueprints: { include: { blueprint: { select: { name: true } } } } } })),
  getById: withPermission("orchestration", "read").input(z.object({ id: z.string() })).query(({ ctx, input }) => ctx.prisma.agent.findUniqueOrThrow({ where: { id: input.id }, include: { blueprints: { include: { blueprint: true } } } })),
  create: withPermission("orchestration", "write").input(z.object({ name: z.string(), projectId: z.string(), description: z.string().optional() })).mutation(({ ctx, input }) => ctx.prisma.agent.create({ data: input })),
  update: withPermission("orchestration", "write").input(z.object({ id: z.string(), data: z.record(z.unknown()) })).mutation(({ ctx, input }) => ctx.prisma.agent.update({ where: { id: input.id }, data: input.data as any })),
});
// ===== vector.ts =====
export const vectorRouter = router({
  search: withPermission("knowledge", "read").input(z.object({ projectId: z.string(), query: z.string(), topK: z.number().default(5), collection: z.string().default("atoms") })).query(async ({ ctx, input }) => {
    // TODO: 接入 Qdrant 向量检索
    return { results: [], message: "向量检索服务待接入" };
  }),
});
```

### src/app/api/trpc/[trpc]/route.ts

```tsx
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers/_app";
import { createContext } from "@/server/trpc";
import { auth } from "@/lib/auth";
const handler = async (req: Request) => {
  const session = await auth();
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(session),
  });
};
export { handler as GET, handler as POST };
```

### src/lib/trpc.ts — 客户端