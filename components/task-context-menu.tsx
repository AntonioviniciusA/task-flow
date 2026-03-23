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
  canEdit: boolean;
  onEdit: () => void;
  onShare: (mode: "copy" | "sync") => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

export function TaskContextMenu({
  task,
  isSharing,
  isCompleted,
  canEdit,
  onEdit,
  onShare,
  onToggleStatus,
  onDelete,
}: TaskContextMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit} disabled={!canEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Editar
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
          <DropdownMenuItem onClick={onToggleStatus} disabled={!canEdit}>
            <Clock className="h-4 w-4 mr-2" />
            Reabrir
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onToggleStatus} disabled={!canEdit}>
            <Check className="h-4 w-4 mr-2" />
            Concluir
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={onDelete}
          disabled={!canEdit}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
