"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { formatDateTime } from "@/lib/utils";
import { Plus, Edit, Trash2, User, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── 权限矩阵定义 ── */
const MODULES = ["知识中心","提示词","编排","治理","企业后台"];
type Perm = "manage"|"edit"|"read"|"none";
const PERM_STYLE: Record<Perm,{label:string;cls:string}> = {
  manage: { label:"🟣管理", cls:"bg-purple-100 text-purple-700" },
  edit:   { label:"🔵编辑", cls:"bg-blue-100 text-blue-700" },
  read:   { label:"🟢只读", cls:"bg-green-100 text-green-700" },
  none:   { label:"⚪无",   cls:"bg-gray-100 text-gray-400" },
};
const ROLE_PERMS: { role:string; perms: Perm[] }[] = [
  { role:"超级管理员",   perms:["manage","manage","manage","manage","manage"] },
  { role:"租户管理员",   perms:["manage","manage","manage","manage","edit"] },
  { role:"知识编辑",     perms:["edit","read","none","none","none"] },
  { role:"Prompt工程师", perms:["read","edit","edit","read","none"] },
  { role:"运营/投手",    perms:["none","read","edit","read","none"] },
  { role:"审核人",       perms:["edit","read","edit","read","none"] },
  { role:"只读成员",     perms:["read","none","read","none","none"] },
];

const roleOptions = [
  { id:"SUPER_ADMIN", name:"超级管理员" },
  { id:"TENANT_ADMIN", name:"租户管理员" },
  { id:"KNOWLEDGE_EDITOR", name:"知识编辑员" },
  { id:"PROMPT_ENGINEER", name:"提示工程师" },
  { id:"OPERATOR", name:"运营专员" },
  { id:"REVIEWER", name:"审核员" },
  { id:"READONLY", name:"只读用户" },
];

export default function UserAndRoleManagementPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("users");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [newUser, setNewUser] = useState({ name:"", email:"", role:"READONLY" as const, tenantId:"" });
  const [editingUser, setEditingUser] = useState<any>(null);

  const utils = trpc.useUtils();
  const { data: userResponse, isLoading, refetch } = trpc.user.list.useQuery({ limit:10, offset:(page-1)*10 });
  const { data: tenants } = trpc.tenant.list.useQuery();

  const updateRole = trpc.user.updateRole.useMutation({
    onSuccess:()=>{ toast({title:"角色已更新"}); utils.user.list.invalidate(); },
    onError:(e)=>toast({title:"更新失败",description:e.message,variant:"destructive"}),
  });
  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess:()=>{ toast({title:"用户已更新"}); utils.user.list.invalidate(); setEditingUser(null); setShowEdit(false); },
    onError:(e)=>toast({title:"更新失败",description:e.message,variant:"destructive"}),
  });

  const users = userResponse?.items || [];

  const userColumns: Column<any>[] = [
    { key:"name", label:"姓名", render:(u)=>(
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center"><User className="h-4 w-4 text-brand" /></div>
        <div><div className="text-sm font-medium">{u.name}</div><div className="text-xs text-gray-400">{u.email}</div></div>
      </div>
    )},
    { key:"role", label:"角色", render:(u)=><Badge variant="outline">{roleOptions.find(r=>r.id===u.role)?.name||u.role}</Badge> },
    { key:"tenant", label:"租户", render:(u)=><span className="text-xs">{u.tenant?.name||"—"}</span> },
    { key:"status", label:"状态", render:(u)=><Badge variant={u.status==="active"?"default":"secondary"}>{u.status==="active"?"活跃":"禁用"}</Badge> },
    { key:"createdAt", label:"加入时间", render:(u)=><span className="text-xs">{formatDateTime(u.createdAt)}</span> },
    { key:"actions", label:"操作", render:(u)=>(
      <div className="flex gap-1">
        <button onClick={()=>{setEditingUser(u);setShowEdit(true);}} className="p-1 rounded hover:bg-gray-100"><Edit className="h-4 w-4 text-gray-500" /></button>
      </div>
    )},
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="用户与角色管理" description="管理系统用户和权限矩阵"
        action={activeTab==="users" ? (
          <Button onClick={()=>setShowCreate(true)} className="gap-2 bg-brand text-white"><Plus className="h-4 w-4" /> 邀请用户</Button>
        ) : null}
      />

      {/* Tab 切换 */}
      <div className="border-b px-6">
        <div className="flex gap-6">
          {(["users","roles"] as const).map(t=>(
            <button key={t} onClick={()=>setActiveTab(t)}
              className={`py-3 text-sm font-medium border-b-2 transition ${activeTab===t ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t==="users" ? "用户管理" : "角色权限"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {activeTab === "users" && (
          <>
            <DataTable columns={userColumns} data={users} isLoading={isLoading} />
            <Pagination currentPage={page} totalPages={Math.ceil((userResponse?.totalCount||1)/10)} onPageChange={setPage} />
          </>
        )}

        {activeTab === "roles" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">权限矩阵</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs gap-1"><Plus className="h-3 w-3" /> 新建自定义角色</Button>
                <Button size="sm" className="text-xs bg-brand text-white">保存更改</Button>
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">角色 \ 模块</th>
                    {MODULES.map(m=><th key={m} className="px-4 py-3 text-center text-xs font-semibold text-gray-600">{m}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ROLE_PERMS.map(rp=>(
                    <tr key={rp.role} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-sm">{rp.role}</td>
                      {rp.perms.map((p,i)=>(
                        <td key={i} className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${PERM_STYLE[p].cls}`}>
                            {PERM_STYLE[p].label}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex gap-4 text-xs text-gray-500">
              <span>图例:</span>
              {Object.entries(PERM_STYLE).map(([k,v])=>(
                <span key={k} className={`px-2 py-0.5 rounded-full ${v.cls}`}>{v.label}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 创建用户弹窗 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>邀请新用户</DialogTitle><DialogDescription>向系统邀请新用户</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>姓名</Label><Input value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})} placeholder="输入姓名" /></div>
            <div><Label>邮箱</Label><Input value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} placeholder="输入邮箱" /></div>
            <div><Label>角色</Label>
              <Select value={newUser.role} onValueChange={v=>setNewUser({...newUser,role:v as any})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{roleOptions.map(r=><SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>租户</Label>
              <Select value={newUser.tenantId} onValueChange={v=>setNewUser({...newUser,tenantId:v})}>
                <SelectTrigger><SelectValue placeholder="选择租户" /></SelectTrigger>
                <SelectContent>{tenants?.map(t=><SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={()=>setShowCreate(false)}>取消</Button>
            <Button className="bg-brand text-white" onClick={()=>{toast({title:"邀请已发送"});setShowCreate(false);}}>发送邀请</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑用户弹窗 */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑用户</DialogTitle></DialogHeader>
          {editingUser && (
            <div className="space-y-3">
              <div><Label>姓名</Label><Input value={editingUser.name} onChange={e=>setEditingUser({...editingUser,name:e.target.value})} /></div>
              <div><Label>邮箱</Label><Input value={editingUser.email} onChange={e=>setEditingUser({...editingUser,email:e.target.value})} /></div>
              <div><Label>角色</Label>
                <Select value={editingUser.role} onValueChange={v=>setEditingUser({...editingUser,role:v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{roleOptions.map(r=><SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={()=>setShowEdit(false)}>取消</Button>
            <Button className="bg-brand text-white" onClick={()=>updateProfile.mutate({id:editingUser.id,name:editingUser.name,email:editingUser.email})}>
              更新
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
