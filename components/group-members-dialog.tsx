"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  ShieldCheck, 
  UserMinus, 
  ShieldAlert, 
  MoreHorizontal,
  Check,
  X,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  joined_at: string;
}

interface GroupMembersDialogProps {
  groupId: string;
  groupName: string;
  isAdmin: boolean;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function GroupMembersDialog({
  groupId,
  groupName,
  isAdmin,
  currentUserId,
  open,
  onOpenChange,
}: GroupMembersDialogProps) {
  const { data, mutate, isLoading } = useSWR(
    open ? `/api/groups/${groupId}/members` : null,
    fetcher
  );
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const members: Member[] = data?.data ?? [];

  async function handleUpdateRole(userId: string, newRole: string) {
    setIsProcessing(userId);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        toast.success(newRole === "admin" ? "Membro promovido!" : "Cargo removido");
        mutate();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erro ao atualizar cargo");
      }
    } catch {
      toast.error("Erro na conexão");
    } finally {
      setIsProcessing(null);
    }
  }

  async function handleKick(userId: string) {
    if (!confirm("Tem certeza que deseja remover este membro?")) return;
    
    setIsProcessing(userId);
    try {
      const res = await fetch(`/api/groups/${groupId}/members?userId=${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Membro removido!");
        mutate();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erro ao remover membro");
      }
    } catch {
      toast.error("Erro na conexão");
    } finally {
      setIsProcessing(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Membros - {groupName}
          </DialogTitle>
          <DialogDescription>
            Visualize e gerencie quem participa deste grupo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground italic">Nenhum membro encontrado.</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-2 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {member.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate max-w-[120px]">
                          {member.name}
                          {member.id === currentUserId && " (Você)"}
                        </span>
                        {member.role === "admin" ? (
                          <Badge variant="secondary" className="text-[8px] h-3.5 px-1 bg-primary/10 text-primary border-primary/20">
                            <ShieldCheck className="w-2 h-2 mr-0.5" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[8px] h-3.5 px-1">Membro</Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground truncate">{member.email}</span>
                    </div>
                  </div>

                  {isAdmin && member.id !== currentUserId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!!isProcessing}>
                          {isProcessing === member.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <MoreHorizontal className="w-4 h-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.role === "member" ? (
                          <DropdownMenuItem onClick={() => handleUpdateRole(member.id, "admin")}>
                            <ShieldCheck className="w-4 h-4 mr-2" />
                            Dar Admin
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleUpdateRole(member.id, "member")}>
                            <ShieldAlert className="w-4 h-4 mr-2" />
                            Remover Admin
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={() => handleKick(member.id)}>
                          <UserMinus className="w-4 h-4 mr-2" />
                          Kikar Membro
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
