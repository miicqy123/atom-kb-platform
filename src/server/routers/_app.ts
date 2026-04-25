import { router } from "../trpc";
import { rawRouter } from "./raw";
import { atomRouter } from "./atom";
import { categoryRouter } from "./category";
import { qaRouter } from "./qa";
import { projectRouter } from "./project";
import { userRouter } from "./user";
import { workspaceRouter } from "./workspace";
import { blueprintRouter } from "./blueprint";
import { agentRouter } from "./agent";
import { workflowRouter } from "./workflow";
import { tenantRouter } from "./tenant";
import { dashboardRouter } from "./dashboard";
import { authRouter } from "./auth";
import { workbenchRouter } from "./workbench";
import { modelGatewayRouter } from "./modelGateway";
import { auditLogRouter } from "./auditLog";
import { evaluationRouter } from "./evaluation";
import { basePackRouter } from "./basePack";
import { reviewRouter } from "./review";
import { workflowRunRouter } from "./workflowRun";
import { analyticsRouter } from "./analytics";
import { roleRouter } from "./role";
import { taxonomyRouter } from "./taxonomy";
import { pipelineRouter } from "./pipeline";
import { vectorRouter } from './vector';
import { slotConfigRouter } from './slotConfig';
import { dimensionRouter } from './dimension';
import { gatewayRouter } from './gateway';
import { orchestrationRouter } from './orchestration';
import { documentParseConfigRouter } from './document-parse-config';
import { moduleRouter } from './module';
import { packRouter } from './pack';
import { cloneRouter } from './clone';
import { taskRouter } from './task';

export const appRouter = router({
  raw: rawRouter,
  atom: atomRouter,
  category: categoryRouter,
  qa: qaRouter,
  qaPair: qaRouter,
  project: projectRouter,
  user: userRouter,
  workspace: workspaceRouter,
  blueprint: blueprintRouter,
  agent: agentRouter,
  workflow: workflowRouter,
  tenant: tenantRouter,
  dashboard: dashboardRouter,
  auth: authRouter,
  workbench: workbenchRouter,
  modelGateway: modelGatewayRouter,
  auditLog: auditLogRouter,
  evaluation: evaluationRouter,
  basePack: basePackRouter,
  review: reviewRouter,
  workflowRun: workflowRunRouter,
  analytics: analyticsRouter,
  role: roleRouter,
  taxonomy: taxonomyRouter,
  pipeline: pipelineRouter,
  vector: vectorRouter,
  slotConfig: slotConfigRouter,
  dimension: dimensionRouter,
  gateway: gatewayRouter,
  orchestration: orchestrationRouter,
  documentParseConfig: documentParseConfigRouter,
  module: moduleRouter,
  pack: packRouter,
  clone: cloneRouter,
  task: taskRouter,
});

export type AppRouter = typeof appRouter;