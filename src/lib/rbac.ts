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