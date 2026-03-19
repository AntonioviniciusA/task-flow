"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Link2 } from "lucide-react";

export function JoinTaskButton() {
  const { mutate } = useSWRConfig();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [taskId, setTaskId] = useState("");

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!taskId.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/tasks/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: taskId.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Tarefa vinculada com sucesso!");
        mutate("/api/tasks");
        setOpen(false);
        setTaskId("");
      } else {
        toast.error(data.error || "Erro ao vincular tarefa");
      }
    } catch {
      toast.error("Erro ao vincular tarefa");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Link2 className="h-4 w-4" />
          Vincular
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular Tarefa</DialogTitle>
          <DialogDescription>
            Cole o ID da tarefa que deseja acompanhar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleJoin} className="space-y-4">
          <Input
            placeholder="Cole o ID da tarefa aqui..."
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            disabled={isLoading}
            required
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !taskId.trim()}>
              {isLoading ? (
                <>
                  <Spinner className="mr-2" />
                  Vinculando...
                </>
              ) : (
                "Vincular"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
