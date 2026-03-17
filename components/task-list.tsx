"use client";

import useSWR from "swr";
import { TaskCard } from "./task-card";
import { Empty } from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Task } from "@/lib/types";
import { ClipboardList } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function TaskList() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean;
    data: Task[];
  }>("/api/tasks", fetcher, { refreshInterval: 30000 });

  if (error) {
    return (
      <Empty
        icon={ClipboardList}
        title="Erro ao carregar tarefas"
        description="Não foi possível carregar suas tarefas. Tente novamente."
      />
    );
  }

  if (isLoading) {
    return null; // Skeleton is shown by Suspense
  }

  const tasks = data?.data || [];

  const pendingTasks = tasks.filter(
    (t) => t.status === "pending" || t.status === "in_progress",
  );
  const completedTasks = tasks.filter((t) => t.status === "completed");

  if (tasks.length === 0) {
    return (
      <Empty
        icon={ClipboardList}
        title="Nenhuma tarefa ainda"
        description="Crie sua primeira tarefa clicando no botão acima"
      />
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            Pendentes
            {pendingTasks.length > 0 && (
              <span className="bg-[#007AFF]/20 text-[#007AFF] text-xs px-2 py-0.5 rounded-full">
                {pendingTasks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            Concluídas
            {completedTasks.length > 0 && (
              <span className="bg-neutral-200 text-neutral-600 text-xs px-2 py-0.5 rounded-full">
                {completedTasks.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {pendingTasks.length === 0 ? (
            <Empty
              icon={ClipboardList}
              title="Tudo em dia!"
              description="Você não tem tarefas pendentes"
            />
          ) : (
            pendingTasks.map((task) => (
              <TaskCard key={task.id} task={task} onUpdate={() => mutate()} />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3">
          {completedTasks.length === 0 ? (
            <Empty
              icon={ClipboardList}
              title="Nenhuma tarefa concluída"
              description="Complete suas tarefas para vê-las aqui"
            />
          ) : (
            completedTasks.map((task) => (
              <TaskCard key={task.id} task={task} onUpdate={() => mutate()} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
