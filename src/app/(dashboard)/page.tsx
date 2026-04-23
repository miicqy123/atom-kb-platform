"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsCard } from "@/components/ui/StatsCard";
import { Activity, Database, FileText, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const MOCK_ACTIVITY_DATA = [
  { day: "周一", count: 42 },
  { day: "周二", count: 58 },
  { day: "周三", count: 39 },
  { day: "周四", count: 72 },
  { day: "周五", count: 65 },
  { day: "周六", count: 28 },
  { day: "周日", count: 19 },
];

export default function DashboardPage() {
  // 获取用户仪表板数据
  const { data: userDashboardData, isLoading: userDashboardLoading } = trpc.dashboard.getUserDashboard.useQuery();

  // 获取工作空间仪表板数据
  const firstWorkspace = userDashboardData?.recentWorkspaces?.[0];
  const { data: workspaceDashboardData, isLoading: workspaceDashboardLoading } = trpc.dashboard.getWorkspaceDashboard.useQuery(
    { workspaceId: firstWorkspace?.id || '' },
    { enabled: !!firstWorkspace }
  );

  // 获取项目仪表板数据
  const firstProject = firstWorkspace ?
    { id: 'default-project-id' } : // 在实际应用中，我们应该从项目列表中获取
    null;

  const { data: projectDashboardData, isLoading: projectDashboardLoading } = trpc.dashboard.getProjectDashboard.useQuery(
    { projectId: firstProject?.id || '' },
    { enabled: !!firstProject }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="个人仪表板"
        description="您的工作空间、项目和资源概览"
      />

      {/* 用户统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="我的项目"
          value={userDashboardData?.userStats?.projectsCount?.toString() || "0"}
          color="text-blue-600"
          icon={<Database className="h-4 w-4" />}
        />
        <StatsCard
          title="我的工作空间"
          value={userDashboardData?.userStats?.workspacesCount?.toString() || "0"}
          color="text-green-600"
          icon={<FileText className="h-4 w-4" />}
        />
        <StatsCard
          title="待办事项"
          value={userDashboardData?.userStats?.pendingApprovals?.toString() || "0"}
          color="text-orange-600"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatsCard
          title="近期活动"
          value={userDashboardData?.recentActivity?.length?.toString() || "0"}
          color="text-purple-600"
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      {/* 最近的工作空间和活动 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近工作空间 */}
        <div className="rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-3">最近的工作空间</h3>
          <div className="space-y-3">
            {userDashboardData?.recentWorkspaces?.map((workspace: any) => (
              <div key={workspace.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <h4 className="font-medium text-sm">{workspace.name}</h4>
                  <p className="text-xs text-gray-500">
                    {workspace._count?.projects || 0} 个项目
                  </p>
                </div>
                <span className="text-xs bg-brand/10 text-brand px-2 py-1 rounded">
                  {workspace.type}
                </span>
              </div>
            ))}
            {!userDashboardLoading && (!userDashboardData?.recentWorkspaces || userDashboardData.recentWorkspaces.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">暂无工作空间</p>
            )}
          </div>
        </div>

        {/* 活动图表 */}
        <div className="rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-3">本周活动统计</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MOCK_ACTIVITY_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 工作空间统计 */}
      {firstWorkspace && (
        <div className="rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-3">工作空间统计: {firstWorkspace.name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatsCard
              title="项目总数"
              value={workspaceDashboardData?.projectStats?.reduce((sum: number, stat: any) => sum + stat._count, 0)?.toString() || "0"}
              color="text-blue-600"
            />
            <StatsCard
              title="成员数"
              value={workspaceDashboardData?.memberCount?.toString() || "0"}
              color="text-green-600"
            />
            <StatsCard
              title="素材总数"
              value={workspaceDashboardData?.resourceCounts?.raws?.toString() || "0"}
              color="text-orange-600"
            />
            <StatsCard
              title="最近活动"
              value={workspaceDashboardData?.activityCount?.toString() || "0"}
              color="text-purple-600"
            />
          </div>
        </div>
      )}

      {/* 最近活动列表 */}
      <div className="rounded-xl border bg-white p-4">
        <h3 className="text-sm font-semibold mb-3">最近活动</h3>
        <div className="space-y-2">
          {userDashboardData?.recentActivity?.slice(0, 5).map((activity: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-3 border-b last:border-0">
              <div>
                <p className="text-sm">{activity.action} {activity.entityType}</p>
                <p className="text-xs text-gray-500">{new Date(activity.createdAt).toLocaleString('zh-CN')}</p>
              </div>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">{activity.entityName}</span>
            </div>
          ))}
          {!userDashboardLoading && (!userDashboardData?.recentActivity || userDashboardData.recentActivity.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-4">暂无活动记录</p>
          )}
        </div>
      </div>
    </div>
  );
}