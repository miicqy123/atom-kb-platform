# 项目：原子化知识库平台 (Atom KB Platform)

## 关键路径
- 项目根目录：D:\4-AI\10.claudecode-workspace\提示词自动化\pro
- 注意：不要动 pro/atomized-kb 子目录，那是备份
- 前端代码：src/app/(dashboard)/
- 后端路由：src/server/routers/
- UI组件：src/components/ui/
- 上传API：src/app/api/upload/route.ts

## 技术栈
- Next.js 14 App Router + TypeScript
- Prisma + PostgreSQL (localhost:5432, 密码 postgres, 数据库 atom_kb)
- tRPC 11 + TanStack Query
- Tailwind CSS
- NextAuth.js

## 重要配置
- tsconfig.json 已配置 @/* -> ./src/*
- next.config 已设置 ignoreBuildErrors: true
- .env 中 DATABASE_URL 指向本地 PostgreSQL

## 注意事项
- 不要使用 Badge 的 "success" 或 "warning" variant，只用 default/secondary/destructive/outline
- Dialog/Tabs 等组件是自定义的，不是 Radix UI
- 修改代码前先检查文件是否存在
- 所有新建的 import 必须确保对应文件存在