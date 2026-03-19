"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Edit,
  Copy,
  Share2,
  Clock,
  Check,
  Trash2,
  Users as UsersIcon,
  Star,
} from "lucide-react";
import type { Task } from "@/lib/types";

interface TaskContextMenuProps {
  task: Task;
  isSharing: boolean;
  isCompleted: boolean;
  onEdit: () => void;
  onShare: (mode: "copy" | "sync") => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  onMoveToGroup: () => void;
}

export function TaskContextMenu({
  task,
  isSharing,
  isCompleted,
  onEdit,
  onShare,
  onToggleStatus,
  onDelete,
  onMoveToGroup,
}: TaskContextMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onMoveToGroup}>
          <UsersIcon className="h-4 w-4 mr-2" />
          Vincular ao Grupo
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onShare("copy")}
          disabled={isSharing}
        >
          <Copy className="h-4 w-4 mr-2" />
          Compartilhar Cópia
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onShare("sync")}
          disabled={isSharing}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Sincronizar Tarefa
        </DropdownMenuItem>
        
        {isCompleted ? (
          <DropdownMenuItem onClick={onToggleStatus}>
            <Clock className="h-4 w-4 mr-2" />
            Reabrir
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onToggleStatus}>
            <Check className="h-4 w-4 mr-2" />
            Concluir
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
