"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
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
import type { CreateTaskInput, TaskPriority, TaskFrequency } from "@/lib/types";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
}: CreateTaskDialogProps) {
  const { mutate } = useSWRConfig();

  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [frequency, setFrequency] = useState<TaskFrequency>("once");
  const [frequencyDayOfWeek, setFrequencyDayOfWeek] = useState<string>("0");
  const [frequencyDayOfMonth, setFrequencyDayOfMonth] = useState<string>("1");
  const [notificationTime, setNotificationTime] = useState("09:00");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [allDay, setAllDay] = useState(false);

  // Extrair hora e minuto para os seletores
  const [currentHour, currentMinute] = notificationTime.split(":");

  const updateTime = (h: string, m: string) => {
    setNotificationTime(`${h.padStart(2, "0")}:${m.padStart(2, "0")}`);
  };

  function resetForm() {
    setTitle("");
    setDescription("");
    setDueDate("");
    setFrequency("once");
    setFrequencyDayOfWeek("0");
    setFrequencyDayOfMonth("1");
    setNotificationTime("09:00");
    setPriority("medium");
    setNotificationEnabled(true);
    setAllDay(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      let finalDueDate = dueDate;
      if (frequency === "weekly") {
        const today = new Date();
        const targetDay = parseInt(frequencyDayOfWeek);
        let daysUntil = (targetDay - today.getDay() + 7) % 7;

        // Se for hoje, mas a hora já passou, agenda para a próxima semana
        if (daysUntil === 0 && notificationTime) {
          const [hours, minutes] = (allDay ? "09:00" : notificationTime)
            .split(":")
            .map(Number);
          if (
            today.getHours() > hours ||
            (today.getHours() === hours && today.getMinutes() >= minutes)
          ) {
            daysUntil = 7;
          }
        }

        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + daysUntil);
        finalDueDate = nextDate.toISOString().split("T")[0];
      }

      let scheduledTimeIso: string | undefined;
      if (notificationEnabled && finalDueDate && (notificationTime || allDay)) {
        // Se for "dia todo", usamos o primeiro horário (09:00) como inicial
        const timeToUse = allDay ? "09:00" : notificationTime;
        // Criar data local e converter para ISO UTC
        const localDate = new Date(`${finalDueDate}T${timeToUse}`);
        if (!isNaN(localDate.getTime())) {
          scheduledTimeIso = localDate.toISOString();
        }
      }

      const payload: CreateTaskInput = {
        title,
        description: description || undefined,
        due_date: finalDueDate || undefined,
        frequency,
        frequency_day_of_week:
          frequency === "weekly" ? parseInt(frequencyDayOfWeek) : undefined,
        frequency_day_of_month:
          frequency === "monthly" ? parseInt(frequencyDayOfMonth) : undefined,
        notification_time: allDay ? undefined : notificationTime || undefined,
        priority,
        notification_enabled: notificationEnabled,
        all_day: allDay,
        scheduled_time_iso: scheduledTimeIso,
      };

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Tarefa criada com sucesso!");
        mutate("/api/tasks");
        resetForm();
        onOpenChange(false);
      } else {
        const data = await response.json();
        toast.error(data.error || "Erro ao criar tarefa");
      }
    } catch {
      toast.error("Erro ao criar tarefa");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
          <DialogDescription>
            Crie uma nova tarefa e configure lembretes
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="overflow-x-hidden">
          <div className="max-h-[60vh] overflow-y-auto overflow-x-hidden pr-2 -mr-2">
            <FieldGroup className="py-4">
              <Field>
                <FieldLabel htmlFor="title">Título</FieldLabel>
                <Input
                  id="title"
                  placeholder="O que você precisa fazer?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="description">
                  Descrição (opcional)
                </FieldLabel>
                <Textarea
                  id="description"
                  placeholder="Detalhes adicionais..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  disabled={isLoading}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {frequency !== "weekly" && (
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
                )}

                <Field>
                  <FieldLabel htmlFor="notificationTime">
                    Hora da Notificação
                  </FieldLabel>
                  {allDay ? (
                    <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground italic">
                      3 notificações (09h, 14h, 19h)
                    </div>
                  ) : (
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
                        onChange={(e) =>
                          updateTime(currentHour, e.target.value)
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {Array.from({ length: 12 }, (_, i) => i * 5).map(
                          (m) => (
                            <option key={m} value={m}>
                              {String(m).padStart(2, "0")} min
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {allDay
                      ? "Notificações automáticas durante o dia"
                      : "Intervalos de 5 minutos"}
                  </p>
                </Field>
              </div>

              <Field className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div>
                  <FieldLabel htmlFor="allDay" className="mb-0">
                    Dia Todo
                  </FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    Notificar 3 vezes ao longo do dia
                  </p>
                </div>
                <Switch
                  id="allDay"
                  checked={allDay}
                  onCheckedChange={setAllDay}
                  disabled={isLoading}
                />
              </Field>

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
                    <FieldLabel htmlFor="dayOfWeek">Dia da Semana</FieldLabel>
                    <Select
                      value={frequencyDayOfWeek}
                      onValueChange={setFrequencyDayOfWeek}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="dayOfWeek">
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
                    <FieldLabel htmlFor="dayOfMonth">Dia do Mês</FieldLabel>
                    <Select
                      value={frequencyDayOfMonth}
                      onValueChange={setFrequencyDayOfMonth}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="dayOfMonth">
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
                <FieldLabel htmlFor="priority">Prioridade</FieldLabel>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as TaskPriority)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field className="flex items-center justify-between">
                <div>
                  <FieldLabel htmlFor="notifications" className="mb-0">
                    Lembrete
                  </FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    Receba uma notificação push
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={notificationEnabled}
                  onCheckedChange={setNotificationEnabled}
                  disabled={isLoading}
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
                  Criando...
                </>
              ) : (
                "Criar Tarefa"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
