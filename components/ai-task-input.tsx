"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Send, Plus, Calendar, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

export function AiTaskInput() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<any>(null);
  const { mutate } = useSWRConfig();

  async function handleProcess(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/ai/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();
      
      if (data.type === "question") {
        toast.info(data.question);
        setAiResponse(null);
      } else if (data.type === "task") {
        setAiResponse(data.data);
      }
    } catch (error) {
      toast.error("Erro ao processar com IA");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmTask() {
    if (!aiResponse) return;
    setIsLoading(true);

    // Formatar descrição se houver local ou duração
    let description = "";
    if (aiResponse.location_trigger?.place) {
      description += `Local: ${aiResponse.location_trigger.place}`;
    }
    if (aiResponse.duration_minutes) {
      if (description) description += "\n";
      description += `Duração: ${aiResponse.duration_minutes} min`;
    }

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: aiResponse.title,
          description: description || undefined,
          due_date: aiResponse.date,
          notification_time: aiResponse.time,
          priority:
            aiResponse.priority === "normal" ? "medium" : aiResponse.priority,
          frequency: aiResponse.recurrence || "once",
          notification_enabled: !!aiResponse.time,
        }),
      });

      if (response.ok) {
        toast.success("Tarefa criada via IA!");
        setInput("");
        setAiResponse(null);
        mutate("/api/tasks");
      } else {
        toast.error("Erro ao criar tarefa");
      }
    } catch (error) {
      toast.error("Erro na conexão");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden">
        <CardContent className="p-3">
          <form onSubmit={handleProcess} className="flex gap-2">
            <div className="relative flex-1">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-pulse" />
              <Input
                placeholder="Ex: 'Tirar o lixo amanhã 15h' ou 'Comprar leite'"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="pl-10 bg-background/50 border-primary/10 focus-visible:ring-primary"
                disabled={isLoading}
              />
            </div>
            <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
              {isLoading ? <Spinner className="size-4" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>

      {aiResponse && (
        <Card className="border-success/20 bg-success/5 animate-in slide-in-from-top-2 duration-300">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-success/10 text-success border-success/20 shrink-0">
                  Confirmar Tarefa
                </Badge>
                <h4 className="font-semibold text-foreground truncate w-full sm:w-auto">{aiResponse.title}</h4>
              </div>
              
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {aiResponse.date && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Calendar className="w-3 h-3" />
                    {aiResponse.date}
                  </div>
                )}
                {aiResponse.time && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {aiResponse.time}
                  </div>
                )}
                {aiResponse.priority !== "normal" && (
                  <div className="flex items-center gap-1 text-destructive font-medium shrink-0">
                    <AlertCircle className="w-3 h-3" />
                    Prioridade Alta
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setAiResponse(null)}
                className="flex-1 sm:flex-none"
              >
                Cancelar
              </Button>
              <Button 
                size="sm" 
                className="bg-success hover:bg-success/90 flex-1 sm:flex-none" 
                onClick={handleConfirmTask}
              >
                <Plus className="w-4 h-4 mr-1" />
                Criar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
