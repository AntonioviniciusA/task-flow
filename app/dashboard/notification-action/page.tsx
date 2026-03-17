"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Check, Clock, X, Bell } from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/lib/types";

function NotificationActionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const taskId = searchParams.get("taskId");
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!taskId) {
      router.push("/dashboard");
      return;
    }

    async function fetchTask() {
      try {
        const response = await fetch(`/api/tasks/${taskId}`);
        if (response.ok) {
          const result = await response.json();
          setTask(result.data);
        } else {
          toast.error("Tarefa não encontrada");
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Erro ao buscar tarefa:", error);
        toast.error("Erro ao carregar tarefa");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTask();
  }, [taskId, router]);

  async function handleAction(action: "complete" | "snooze") {
    if (!taskId) return;
    setIsProcessing(true);

    try {
      const response = await fetch(`/api/tasks/${taskId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        toast.success(
          action === "complete" ? "Tarefa concluída!" : "Lembrete adiado",
        );
        router.push("/dashboard");
      } else {
        toast.error("Erro ao processar ação");
      }
    } catch (error) {
      console.error("Erro ao processar ação:", error);
      toast.error("Erro na conexão");
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner size="lg" />
        <p className="text-muted-foreground animate-pulse">
          Carregando detalhes...
        </p>
      </div>
    );
  }

  if (!task) return null;

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/20 animate-in zoom-in-95 duration-300">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">{task.title}</CardTitle>
          {task.description && (
            <p className="text-muted-foreground mt-2">{task.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 gap-3">
            <Button
              size="lg"
              className="h-16 text-lg gap-3 bg-success hover:bg-success/90"
              onClick={() => handleAction("complete")}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Spinner size="sm" />
              ) : (
                <Check className="w-6 h-6" />
              )}
              Concluir Agora
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="h-16 text-lg gap-3 border-primary/20 hover:bg-primary/5"
              onClick={() => handleAction("snooze")}
              disabled={isProcessing}
            >
              <Clock className="w-6 h-6" />
              Adiar 15 min
            </Button>

            <Button
              variant="ghost"
              className="mt-2 text-muted-foreground"
              onClick={() => router.push("/dashboard")}
              disabled={isProcessing}
            >
              <X className="w-4 h-4 mr-2" />
              Ignorar por enquanto
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NotificationActionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Spinner size="lg" />
        </div>
      }
    >
      <NotificationActionContent />
    </Suspense>
  );
}
