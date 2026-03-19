"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Calendar, Clock, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ShareData {
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    priority: "low" | "medium" | "high";
    frequency: string;
  }>;
  mode: "copy" | "sync";
  expires_at: string;
}

export default function SharePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchShareInfo() {
      try {
        const res = await fetch(`/api/share/${token}`);
        const data = await res.json();

        if (res.ok) {
          setShareData(data.data);
        } else {
          setError(data.error || "Link expirado ou inválido");
        }
      } catch (err) {
        setError("Erro ao carregar informações da tarefa");
      } finally {
        setIsLoading(false);
      }
    }

    if (token) fetchShareInfo();
  }, [token]);

  async function handleJoin() {
    setIsJoining(true);
    try {
      const res = await fetch("/api/tasks/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          taskIds: shareData?.tasks.map(t => t.id),
          mode: shareData?.mode 
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Tarefas vinculadas com sucesso!");
        router.push("/dashboard");
      } else if (res.status === 401) {
        toast.error("Você precisa estar logado para vincular as tarefas");
        router.push("/login?callbackUrl=" + window.location.pathname);
      } else {
        toast.error(data.error || "Erro ao vincular tarefas");
      }
    } catch (err) {
      toast.error("Erro na conexão");
    } finally {
      setIsJoining(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md border-destructive/20">
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>Link Inválido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push("/dashboard")}>
              Voltar para o Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shareData) return null;

  const { tasks, mode } = shareData;

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-muted/30">
      <Card className="w-full max-w-md shadow-xl border-primary/10">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {mode === "copy" ? "Copiar Tarefas" : "Sincronizar Tarefas"}
          </CardTitle>
          <CardDescription>
            {mode === "copy" 
              ? "Você recebeu uma cópia destas tarefas." 
              : "Você foi convidado para acompanhar estas tarefas em tempo real."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 -mr-2">
            {tasks.map(task => (
              <div key={task.id} className="p-3 rounded-xl bg-muted/50 border space-y-2">
                <h3 className="font-bold text-sm leading-tight">{task.title}</h3>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                    <Flag className={cn("w-2.5 h-2.5 mr-1", task.priority === 'high' ? 'text-destructive' : 'text-primary')} />
                    {task.priority}
                  </Badge>
                  {task.due_date && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                      <Calendar className="w-2.5 h-2.5 mr-1" />
                      {new Date(task.due_date).toLocaleDateString('pt-BR')}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <Button 
              className="w-full h-12 text-base font-semibold" 
              onClick={handleJoin}
              disabled={isJoining}
            >
              {isJoining ? <Spinner className="mr-2" /> : mode === "copy" ? "Copiar para minha lista" : "Aceitar e Sincronizar"}
            </Button>
            <Button 
              variant="ghost" 
              className="w-full" 
              onClick={() => router.push("/dashboard")}
              disabled={isJoining}
            >
              Cancelar
            </Button>
          </div>
          
          <p className="text-[10px] text-center text-muted-foreground">
            Este link expira em {new Date(shareData.expires_at).toLocaleString('pt-BR')}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
