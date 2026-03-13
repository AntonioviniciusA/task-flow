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
  const [notificationTime, setNotificationTime] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [notificationEnabled, setNotificationEnabled] = useState(true);

  function resetForm() {
    setTitle("");
    setDescription("");
    setDueDate("");
    setFrequency("once");
    setFrequencyDayOfWeek("0");
    setFrequencyDayOfMonth("1");
    setNotificationTime("");
    setPriority("medium");
    setNotificationEnabled(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      let scheduledTimeIso: string | undefined;
      if (notificationEnabled && dueDate && notificationTime) {
        // Criar data local e converter para ISO UTC
        const localDate = new Date(`${dueDate}T${notificationTime}`);
        if (!isNaN(localDate.getTime())) {
          scheduledTimeIso = localDate.toISOString();
        }
      }

      const payload: CreateTaskInput = {
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

        <form onSubmit={handleSubmit}>
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
                <Input
                  id="notificationTime"
                  type="time"
                  value={notificationTime}
                  onChange={(e) => setNotificationTime(e.target.value)}
                  disabled={isLoading}
                />
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
                className="scale-110"
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
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
