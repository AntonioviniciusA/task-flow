"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users as UsersIcon, Star, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

interface MoveToGroupDialogProps {
  task: Task;
  groups: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMove: (groupId: string | null) => void;
  isLoading?: boolean;
}

export function MoveToGroupDialog({
  task,
  groups,
  open,
  onOpenChange,
  onMove,
  isLoading,
}: MoveToGroupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular ao Grupo</DialogTitle>
          <DialogDescription>
            Escolha um grupo para esta tarefa ou torne-a pessoal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between h-12 px-4",
              !task.group_id && "border-primary bg-primary/5"
            )}
            onClick={() => onMove(null)}
            disabled={isLoading || !task.group_id}
          >
            <div className="flex items-center gap-3">
              <Star className={cn("w-5 h-5", !task.group_id ? "text-primary" : "text-muted-foreground")} />
              <div className="text-left">
                <p className="text-sm font-semibold">Tarefa Pessoal</p>
                <p className="text-[10px] text-muted-foreground">Visível apenas para você</p>
              </div>
            </div>
            {!task.group_id && <Check className="w-4 h-4 text-primary" />}
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Seus Grupos</span>
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
            {groups.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4 italic">
                Você ainda não participa de nenhum grupo.
              </p>
            ) : (
              groups.map((group) => (
                <Button
                  key={group.id}
                  variant="outline"
                  className={cn(
                    "w-full justify-between h-12 px-4 transition-all",
                    task.group_id === group.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => onMove(group.id)}
                  disabled={isLoading || task.group_id === group.id}
                >
                  <div className="flex items-center gap-3">
                    <UsersIcon className={cn("w-5 h-5", task.group_id === group.id ? "text-primary" : "text-muted-foreground")} />
                    <div className="text-left">
                      <p className="text-sm font-semibold">{group.name}</p>
                      <p className="text-[10px] text-muted-foreground">Colaborativo</p>
                    </div>
                  </div>
                  {task.group_id === group.id && <Check className="w-4 h-4 text-primary" />}
                </Button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
