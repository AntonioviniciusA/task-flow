"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar, FileJson, Loader2 } from "lucide-react";
import { useSWRConfig } from "swr";

interface ImportScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info, ExternalLink } from "lucide-react";

export function ImportScheduleDialog({
  open,
  onOpenChange,
}: ImportScheduleDialogProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [university, setUniversity] = useState("ucb");
  const [isLoading, setIsLoading] = useState(false);
  const { mutate } = useSWRConfig();

  const diaSemanaMap: Record<string, string> = {
    "0": "Domingo",
    "1": "Segunda",
    "2": "Terça",
    "3": "Quarta",
    "4": "Quinta",
    "5": "Sexta",
    "6": "Sábado",
  };

  const dayToIndex: Record<string, number> = {
    "0": 0,
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
  };

  async function handleImport() {
    if (!jsonInput.trim()) {
      toast.error("Por favor, cole o JSON do horário.");
      return;
    }

    setIsLoading(true);
    try {
      const parsed = JSON.parse(jsonInput);
      const rawSchedules = parsed.data?.SHorarioAluno || [];
      
      if (!Array.isArray(rawSchedules) || rawSchedules.length === 0) {
        toast.error("Formato de JSON inválido ou sem horários.");
        setIsLoading(false);
        return;
      }

      // Filtrar e organizar
      const filtered = rawSchedules.filter((item: any) => item.NOME !== null);
      
      const grouped: Record<string, any> = {};
      
      filtered.forEach((item: any) => {
        const key = `${item.NOME}-${item.DIASEMANA}`;
        if (!grouped[key]) {
          grouped[key] = {
            nome: item.NOME,
            dia: diaSemanaMap[item.DIASEMANA],
            diaSemana: item.DIASEMANA,
            horario_inicio: item.HORAINICIAL,
            horario_fim: item.HORAFINAL,
            sala: item.SALA,
            bloco: item.BLOCO,
            predio: item.PREDIO,
          };
        } else {
          if (item.HORAFINAL > grouped[key].horario_fim) {
            grouped[key].horario_fim = item.HORAFINAL;
          }
          if (item.HORAINICIAL < grouped[key].horario_inicio) {
            grouped[key].horario_inicio = item.HORAINICIAL;
          }
        }
      });

      const finalTasks = Object.values(grouped);
      let successCount = 0;

      for (const task of finalTasks) {
        const description = `Sala: ${task.sala}\nBloco: ${task.bloco}\nPrédio: ${task.predio}`;
        
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `Aula: ${task.nome}`,
            description,
            priority: "medium",
            frequency: "weekly",
            frequency_day_of_week: dayToIndex[task.diaSemana],
            notification_enabled: true,
            notification_time: task.horario_inicio,
            icon: "book-open"
          }),
        });

        if (res.ok) successCount++;
      }

      toast.success(`${successCount} aulas importadas com sucesso!`);
      mutate("/api/tasks");
      onOpenChange(false);
      setJsonInput("");
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast.error("Erro ao processar o JSON. Verifique o formato.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Importar Horário Acadêmico
          </DialogTitle>
          <DialogDescription>
            Siga o tutorial para importar suas aulas automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Seleção de Universidade */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Selecione sua Universidade</label>
            <Select value={university} onValueChange={setUniversity}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ucb">Católica (UCB)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tutorial */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm border border-border">
            <h4 className="font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Como obter o JSON?
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Faça login no seu portal acadêmico (GOL).</li>
              <li>
                Com o portal aberto, acesse este link:
                <a 
                  href="https://portalacademico.ubec.edu.br/FrameHTML/RM/API/TOTVSEducacional/QuadroHorarioAluno" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 mt-1 break-all"
                >
                  https://portalacademico.ubec.edu.br/.../QuadroHorarioAluno
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Copie todo o conteúdo que aparecer na tela.</li>
              <li>Cole o conteúdo no campo abaixo.</li>
            </ol>
          </div>

          {/* Campo de JSON */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Conteúdo do JSON</label>
            <Textarea
              placeholder='Cole aqui o JSON (começando com {"data": ...})'
              className="min-h-[150px] font-mono text-xs"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="sm:flex-1">
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={isLoading} className="sm:flex-1">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <FileJson className="w-4 h-4 mr-2" />
                Importar Aulas
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
