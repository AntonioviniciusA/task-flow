"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users as UsersIcon,
  Plus,
  Link as LinkIcon,
  PlusCircle,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { TaskCard } from "./task-card";
import { GroupMembersDialog } from "./group-members-dialog";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function GroupManager({ userId }: { userId: string }) {
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupPassword, setNewGroupPassword] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);

  const { data: groupsData, mutate: mutateGroups } = useSWR(
    "/api/groups",
    fetcher,
  );
  const { data: groupTasksData, mutate: mutateTasks } = useSWR(
    activeGroupId ? `/api/tasks?groupId=${activeGroupId}` : null,
    fetcher,
  );

  const groups = groupsData?.data ?? [];
  const groupTasks = groupTasksData?.data ?? [];
  const activeGroup = activeGroupId
    ? groups.find((g: any) => g.id === activeGroupId)
    : null;

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName,
          password: newGroupPassword,
        }),
      });
      if (res.ok) {
        toast.success("Grupo criado!");
        setNewGroupName("");
        setNewGroupPassword("");
        setShowCreateDialog(false);
        mutateGroups();
      }
    } catch {
      toast.error("Erro ao criar grupo");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoinGroup(e: React.FormEvent) {
    e.preventDefault();
    setIsJoining(true);
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: activeGroupId,
          password: joinPassword,
        }),
      });
      if (res.ok) {
        toast.success("Você entrou no grupo!");
        setJoinPassword("");
        setShowJoinDialog(false);
        mutateGroups();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erro ao entrar");
      }
    } catch {
      toast.error("Erro na conexão");
    } finally {
      setIsJoining(false);
    }
  }

  async function handleAddTask() {
    const title = prompt("Título da tarefa de grupo:");
    if (!title) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          group_id: activeGroupId,
          priority: "medium",
          notification_enabled: false,
        }),
      });
      if (res.ok) {
        toast.success("Tarefa adicionada ao grupo");
        mutateTasks();
      }
    } catch {
      toast.error("Erro ao adicionar tarefa");
    }
  }

  function copyInviteLink(token: string) {
    const link = `${window.location.origin}/dashboard/groups/join?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link de convite copiado!");
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Sidebar: Grupos */}
      <Card className="md:col-span-1 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <UsersIcon className="w-5 h-5" />
              Meus Grupos
            </CardTitle>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Grupo</DialogTitle>
                  <DialogDescription>
                    Crie um grupo para compartilhar tarefas com amigos.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateGroup} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome do Grupo</label>
                    <Input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Ex: República, Família..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Senha de Acesso
                    </label>
                    <Input
                      type="password"
                      value={newGroupPassword}
                      onChange={(e) => setNewGroupPassword(e.target.value)}
                      placeholder="Senha para novos membros"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isCreating}
                  >
                    {isCreating ? <Spinner className="mr-2" /> : "Criar Grupo"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-2 space-y-1">
          {groups.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 italic">
              Você não participa de nenhum grupo
            </p>
          ) : (
            groups.map((group: any) => (
              <button
                key={group.id}
                onClick={() => setActiveGroupId(group.id)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg text-sm transition-all",
                  activeGroupId === group.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "hover:bg-muted text-muted-foreground",
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      activeGroupId === group.id ? "bg-white" : "bg-primary/40",
                    )}
                  />
                  <span className="font-medium">{group.name}</span>
                </div>
                <ChevronRight
                  className={cn(
                    "w-4 h-4 opacity-50",
                    activeGroupId === group.id && "rotate-90",
                  )}
                />
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {/* Main Area: Tarefas do Grupo */}
      <Card className="md:col-span-2 border-primary/20 min-h-[400px]">
        {!activeGroupId ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <UsersIcon className="w-16 h-16 mb-4 opacity-10" />
            <p className="text-sm">
              Selecione um grupo para ver as tarefas ou crie um novo.
            </p>
          </div>
        ) : (
          <>
            <CardHeader className="border-b bg-primary/5">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {activeGroup?.name}
                  </CardTitle>
                  <CardDescription>
                    Criado em{" "}
                    {new Date(activeGroup?.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMembersDialog(true)}
                  >
                    <UsersIcon className="w-3 h-3 mr-2" />
                    Membros
                  </Button>
                  {activeGroup?.role === "admin" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyInviteLink(activeGroup.invite_token)}
                    >
                      <LinkIcon className="w-3 h-3 mr-2" />
                      Convite
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                  Tarefas Coletivas
                </h3>
                <Button size="sm" onClick={handleAddTask} className="h-8 gap-1">
                  <PlusCircle className="w-4 h-4" />
                  Nova Tarefa
                </Button>
              </div>

              <div className="space-y-3">
                {groupTasks.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl border-muted">
                    <p className="text-xs text-muted-foreground">
                      Nenhuma tarefa neste grupo ainda
                    </p>
                  </div>
                ) : (
                  groupTasks.map((task: any) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onUpdate={() => mutateTasks()}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </>
        )}
      </Card>

      {/* Dialog para entrar em grupo (via link ou manual) */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entrar no Grupo</DialogTitle>
            <DialogDescription>
              Digite a senha para participar deste grupo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleJoinGroup} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Senha</label>
              <Input
                type="password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isJoining}>
              {isJoining ? <Spinner className="mr-2" /> : "Entrar no Grupo"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {activeGroupId && activeGroup && userId && (
        <GroupMembersDialog
          groupId={activeGroupId}
          groupName={activeGroup.name}
          isAdmin={activeGroup.role === "admin"}
          currentUserId={userId}
          open={showMembersDialog}
          onOpenChange={setShowMembersDialog}
        />
      )}
    </div>
  );
}
