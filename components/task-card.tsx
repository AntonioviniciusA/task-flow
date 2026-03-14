"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Task, NetworkContext } from "@/lib/types";
import {
  MoreVertical,
  Check,
  Clock,
  Trash2,
  Edit,
  Bell,
  BellOff,
  Calendar,
  Flag,
  Wifi,
} from "lucide-react";
import { EditTaskDialog } from "./edit-task-dialog";

interface TaskCardProps {
  task: Task;
  onUpdate: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const priorityConfig = {
  low: { label: "Baixa", color: "bg-muted text-muted-foreground" },
  medium: { label: "Média", color: "bg-warning/20 text-warning-foreground" },
  high: { label: "Alta", color: "bg-destructive/20 text-destructive" },
};

const frequencyLabels: Record<string, string> = {
  once: "Uma vez",
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
};

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function TaskCard({ task, onUpdate }: TaskCardProps) {
  const { data: networkData } = useSWR<{
    success: boolean;
    data: NetworkContext[];
  }>("/api/settings/networks", fetcher);

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const isCompleted = task.status === "completed";
  const priority = priorityConfig[task.priority];

  const assignedNetwork = networkData?.data?.find(
    (n) => n.id === task.network_context_id,
  );

  async function handleComplete() {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      if (response.ok) {
        toast.success("Tarefa concluída!");
        onUpdate();
      } else {
        toast.error("Erro ao atualizar tarefa");
      }
    } catch {
      toast.error("Erro ao atualizar tarefa");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleReopen() {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending" }),
      });

      if (response.ok) {
        toast.success("Tarefa reaberta");
        onUpdate();
      } else {
        toast.error("Erro ao reabrir tarefa");
      }
    } catch {
      toast.error("Erro ao reabrir tarefa");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Tarefa excluída");
        onUpdate();
      } else {
        toast.error("Erro ao excluir tarefa");
      }
    } catch {
      toast.error("Erro ao excluir tarefa");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return null;
    const date = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() === today.getTime()) return "Hoje";
    if (date.getTime() === tomorrow.getTime()) return "Amanhã";

    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  }

  const formattedDate = formatDate(task.due_date);
  const isOverdue =
    task.due_date && new Date(task.due_date) < new Date() && !isCompleted;

  return (
    <>
      <Card
        className={cn(
          "transition-all",
          isCompleted && "opacity-60",
          isOverdue && "border-destructive/50",
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "h-6 w-6 shrink-0 rounded-full",
                  isCompleted &&
                    "bg-success text-success-foreground border-success",
                )}
                onClick={isCompleted ? handleReopen : handleComplete}
                disabled={isUpdating}
              >
                {isCompleted && <Check className="h-3 w-3" />}
              </Button>
              <div className="min-w-0 flex-1">
                <h3
                  className={cn(
                    "font-medium text-foreground truncate",
                    isCompleted && "line-through text-muted-foreground",
                  )}
                >
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {task.description}
                  </p>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                {isCompleted ? (
                  <DropdownMenuItem onClick={handleReopen}>
                    <Clock className="h-4 w-4 mr-2" />
                    Reabrir
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleComplete}>
                    <Check className="h-4 w-4 mr-2" />
                    Concluir
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="secondary"
              className={cn("text-xs", priority.color)}
            >
              <Flag className="h-3 w-3 mr-1" />
              {priority.label}
            </Badge>

            {formattedDate && (
              <Badge
                variant="outline"
                className="text-[10px] py-0 h-5 border-neutral-200"
              >
                <Calendar className="h-3 w-3 mr-1 opacity-60" />
                {formattedDate}
              </Badge>
            )}

            {assignedNetwork && (
              <Badge
                variant="outline"
                className="text-[10px] py-0 h-5 border-[#007AFF]/20 bg-[#007AFF]/5 text-[#007AFF]"
              >
                <Wifi className="h-3 w-3 mr-1" />
                {assignedNetwork.name}
              </Badge>
            )}

            {task.notification_enabled ? (
              <Badge
                variant="secondary"
                className="text-xs bg-primary/10 text-primary"
              >
                <Bell className="h-3 w-3 mr-1" />
                {task.notification_time
                  ? `Às ${task.notification_time}`
                  : "Lembrete Ativo"}
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="text-xs bg-muted text-muted-foreground"
              >
                <BellOff className="h-3 w-3 mr-1" />
                Sem lembrete
              </Badge>
            )}

            {task.frequency && task.frequency !== "once" && (
              <Badge
                variant="secondary"
                className="text-xs bg-accent text-accent-foreground"
              >
                <Clock className="h-3 w-3 mr-1" />
                {frequencyLabels[task.frequency]}
                {task.frequency === "weekly" &&
                  task.frequency_day_of_week !== null &&
                  ` (${weekDays[task.frequency_day_of_week]})`}
                {task.frequency === "monthly" &&
                  task.frequency_day_of_month !== null &&
                  ` (Dia ${task.frequency_day_of_month})`}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tarefa será permanentemente
              excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditTaskDialog
        task={task}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onUpdate={onUpdate}
      />
    </>
  );
}
