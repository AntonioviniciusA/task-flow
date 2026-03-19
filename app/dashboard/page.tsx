import { Suspense } from "react";
import { TaskList } from "@/components/task-list";
import { TaskListSkeleton } from "@/components/task-list-skeleton";
import { CreateTaskButton } from "@/components/create-task-button";
import { JoinTaskButton } from "@/components/join-task-button";
import { NotificationBanner } from "@/components/notification-banner";
import { AiTaskInput } from "@/components/ai-task-input";
import { GamificationSystem } from "@/components/gamification-system";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Trophy, Users as UsersIcon } from "lucide-react";
import { GroupManager } from "@/components/group-manager";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Painel Principal
          </h1>
          <p className="text-muted-foreground text-sm">
            Gerencie suas tarefas e suba no ranking
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <JoinTaskButton />
          <CreateTaskButton />
        </div>
      </div>

      <Tabs defaultValue="tasks" className="w-full space-y-6">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 h-10 p-1 bg-muted/50 border border-border/50">
          <TabsTrigger
            value="tasks"
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <LayoutDashboard className="w-4 h-4" />
            Tarefas
          </TabsTrigger>
          <TabsTrigger
            value="groups"
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <UsersIcon className="w-4 h-4" />
            Grupos
          </TabsTrigger>
          <TabsTrigger
            value="gamification"
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Trophy className="w-4 h-4" />
            Ranking
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-6 m-0 outline-none">
          <AiTaskInput />
          <NotificationBanner />
          <Suspense fallback={<TaskListSkeleton />}>
            <TaskList />
          </Suspense>
        </TabsContent>

        <TabsContent
          value="groups"
          className="m-0 outline-none animate-in fade-in slide-in-from-bottom-2"
        >
          <GroupManager />
        </TabsContent>

        <TabsContent
          value="gamification"
          className="m-0 outline-none animate-in fade-in slide-in-from-bottom-2"
        >
          <GamificationSystem />
        </TabsContent>
      </Tabs>
    </div>
  );
}
