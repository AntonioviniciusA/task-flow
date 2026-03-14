"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Wifi } from "lucide-react";
import type {
  Task,
  TaskPriority,
  TaskFrequency,
  UpdateTaskInput,
  NetworkContext,
} from "@/lib/types";

interface EditTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function EditTaskDialog({
  task,
  open,
  onOpenChange,
  onUpdate,
}: EditTaskDialogProps) {
  const { data: networkData } = useSWR<{
    success: boolean;
    data: NetworkContext[];
  }>("/api/settings/networks", fetcher);

  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const [frequency, setFrequency] = useState<TaskFrequency>(
    task.frequency || "once",
  );
  const [frequencyDayOfWeek, setFrequencyDayOfWeek] = useState<string>(
    String(task.frequency_day_of_week ?? "0"),
  );
  const [frequencyDayOfMonth, setFrequencyDayOfMonth] = useState<string>(
    String(task.frequency_day_of_month ?? "1"),
  );
  const [notificationTime, setNotificationTime] = useState(
    task.notification_time || "09:00",
  );
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [notificationEnabled, setNotificationEnabled] = useState(
    task.notification_enabled,
  );
  const [networkContextId, setNetworkContextId] = useState<string>(
    task.network_context_id || "none",
  );

  // Extrair hora e minuto para os seletores
  const [currentHour, currentMinute] = (notificationTime || "09:00").split(":");

  const updateTime = (h: string, m: string) => {
    setNotificationTime(`${h.padStart(2, "0")}:${m.padStart(2, "0")}`);
  };

  useEffect(() => {
    if (open) {
      setTitle(task.title);
      setDescription(task.description || "");
      setDueDate(task.due_date || "");
      setFrequency(task.frequency || "once");
      setFrequencyDayOfWeek(String(task.frequency_day_of_week ?? "0"));
      setFrequencyDayOfMonth(String(task.frequency_day_of_month ?? "1"));
      setNotificationTime(task.notification_time || "09:00");
      setPriority(task.priority);
      setNotificationEnabled(task.notification_enabled);
      setNetworkContextId(task.network_context_id || "none");
    }
  }, [task, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      let scheduledTimeIso: string | undefined;
      if (notificationEnabled && dueDate && notificationTime) {
        const localDate = new Date(`${dueDate}T${notificationTime}`);
        if (!isNaN(localDate.getTime())) {
          scheduledTimeIso = localDate.toISOString();
        }
      }

      const payload: UpdateTaskInput = {
        title,
        description: description || undefined,
        due_date: dueDate || undefined,
        frequency,
        frequency_day_of_week:
          frequency === "weekly" ? parseInt(frequencyDayOfWeek) : undefined,
        frequency_day_of_month:
          frequency === "monthly" ? parseInt(frequencyDayOfMonth) : undefined,
        notification_time: notificationTime || undefined,
        priority,
        notification_enabled: notificationEnabled,
        scheduled_time_iso: scheduledTimeIso,
        network_context_id:
          networkContextId === "none" ? null : networkContextId,
      };

      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Tarefa atualizada!");
        onUpdate();
        onOpenChange(false);
      } else {
        const data = await response.json();
        toast.error(data.error || "Erro ao atualizar tarefa");
      }
    } catch {
      toast.error("Erro ao atualizar tarefa");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Tarefa</DialogTitle>
          <DialogDescription>
            Atualize os detalhes da sua tarefa
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="overflow-x-hidden">
          <div className="max-h-[60vh] overflow-y-auto overflow-x-hidden pr-2 -mr-2">
            <FieldGroup className="py-4">
              <Field>
                <FieldLabel htmlFor="edit-title">Título</FieldLabel>
                <Input
                  id="edit-title"
                  placeholder="O que você precisa fazer?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="edit-description">
                  Descrição (opcional)
                </FieldLabel>
                <Textarea
                  id="edit-description"
                  placeholder="Detalhes adicionais..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  disabled={isLoading}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="dueDate">Data</FieldLabel>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={isLoading}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="notificationTime">
                    Hora da Notificação
                  </FieldLabel>
                  <div className="flex gap-2">
                    <select
                      value={parseInt(currentHour)}
                      onChange={(e) =>
                        updateTime(e.target.value, currentMinute)
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}h
                        </option>
                      ))}
                    </select>

                    <select
                      value={parseInt(currentMinute)}
                      onChange={(e) => updateTime(currentHour, e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                        <option key={m} value={m}>
                          {String(m).padStart(2, "0")} min
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Intervalos de 5 minutos
                  </p>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="frequency">Frequência</FieldLabel>
                  <Select
                    value={frequency}
                    onValueChange={(v) => setFrequency(v as TaskFrequency)}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Uma vez</SelectItem>
                      <SelectItem value="daily">Diária</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {frequency === "weekly" && (
                  <Field>
                    <FieldLabel htmlFor="edit-dayOfWeek">
                      Dia da Semana
                    </FieldLabel>
                    <Select
                      value={frequencyDayOfWeek}
                      onValueChange={setFrequencyDayOfWeek}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="edit-dayOfWeek">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Domingo</SelectItem>
                        <SelectItem value="1">Segunda-feira</SelectItem>
                        <SelectItem value="2">Terça-feira</SelectItem>
                        <SelectItem value="3">Quarta-feira</SelectItem>
                        <SelectItem value="4">Quinta-feira</SelectItem>
                        <SelectItem value="5">Sexta-feira</SelectItem>
                        <SelectItem value="6">Sábado</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                {frequency === "monthly" && (
                  <Field>
                    <FieldLabel htmlFor="edit-dayOfMonth">
                      Dia do Mês
                    </FieldLabel>
                    <Select
                      value={frequencyDayOfMonth}
                      onValueChange={setFrequencyDayOfMonth}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="edit-dayOfMonth">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(
                          (day) => (
                            <SelectItem key={day} value={day.toString()}>
                              Dia {day}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </div>

              <Field>
                <FieldLabel htmlFor="edit-priority">Prioridade</FieldLabel>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as TaskPriority)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="edit-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="edit-networkContext">
                  Localização (Wi-Fi)
                </FieldLabel>
                <Select
                  value={networkContextId}
                  onValueChange={setNetworkContextId}
                  disabled={isLoading}
                >
                  <SelectTrigger id="edit-networkContext">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-muted-foreground" />
                      <SelectValue placeholder="Selecione um local" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Qualquer lugar</SelectItem>
                    {networkData?.data?.map((net) => (
                      <SelectItem key={net.id} value={net.id}>
                        {net.name} ({net.context_slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[10px] text-muted-foreground leading-tight">
                  A tarefa será priorizada quando você estiver nesta rede.
                </p>
              </Field>

              <Field className="flex items-center justify-between">
                <div>
                  <FieldLabel htmlFor="edit-notifications" className="mb-0">
                    Lembrete
                  </FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    Receba uma notificação push
                  </p>
                </div>
                <Switch
                  id="edit-notifications"
                  checked={notificationEnabled}
                  onCheckedChange={setNotificationEnabled}
                  disabled={isLoading}
                  className=""
                />
              </Field>
            </FieldGroup>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !title.trim()}>
              {isLoading ? (
                <>
                  <Spinner className="mr-2" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
