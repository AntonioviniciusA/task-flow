"use client";

import { useState, useEffect } from "react";
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
import type {
  Task,
  TaskPriority,
  TaskFrequency,
  UpdateTaskInput,
} from "@/lib/types";

interface EditTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function EditTaskDialog({
  task,
  open,
  onOpenChange,
  onUpdate,
}: EditTaskDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const [dueTime, setDueTime] = useState(task.due_time || "");
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
    task.notification_time || "",
  );
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [notificationEnabled, setNotificationEnabled] = useState(
    task.notification_enabled,
  );

  useEffect(() => {
    if (open) {
      setTitle(task.title);
      setDescription(task.description || "");
      setDueDate(task.due_date || "");
      setDueTime(task.due_time || "");
      setFrequency(task.frequency || "once");
      setFrequencyDayOfWeek(String(task.frequency_day_of_week ?? "0"));
      setFrequencyDayOfMonth(String(task.frequency_day_of_month ?? "1"));
      setNotificationTime(task.notification_time || "");
      setPriority(task.priority);
      setNotificationEnabled(task.notification_enabled);
    }
  }, [task, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload: UpdateTaskInput = {
        title,
        description: description || undefined,
        due_date: dueDate || undefined,
        due_time: dueTime || undefined,
        frequency,
        frequency_day_of_week:
          frequency === "weekly" ? parseInt(frequencyDayOfWeek) : undefined,
        frequency_day_of_month:
          frequency === "monthly" ? parseInt(frequencyDayOfMonth) : undefined,
        notification_time: notificationTime || undefined,
        priority,
        notification_enabled: notificationEnabled,
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

        <form onSubmit={handleSubmit}>
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

            <div className="grid grid-cols-2 gap-4">
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
                <FieldLabel htmlFor="dueTime">Horário Limite</FieldLabel>
                <Input
                  id="dueTime"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  disabled={isLoading}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  <FieldLabel htmlFor="edit-dayOfMonth">Dia do Mês</FieldLabel>
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
