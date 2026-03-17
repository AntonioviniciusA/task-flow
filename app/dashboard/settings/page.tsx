"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { useTheme } from "next-themes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Bell,
  BellOff,
  Smartphone,
  Trash2,
  Download,
  RefreshCw,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import type { Device } from "@/lib/types";
import { Input } from "@/components/ui/input";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { data, mutate } = useSWR<{ success: boolean; data: Device[] }>(
    "/api/devices",
    fetcher,
  );

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [persistentInterval, setPersistentInterval] = useState("60");
  const [notificationSound, setNotificationSound] = useState(true);
  const [notificationVibration, setNotificationVibration] = useState(true);

  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Load settings from API
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings/notifications");
        if (res.ok) {
          const result = await res.json();
          if (result.success) {
            setPersistentInterval(String(result.data.persistent_interval));
            setNotificationSound(result.data.notification_sound);
            setNotificationVibration(result.data.notification_vibration);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      }
    }

    loadSettings();

    // Check notification permission
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }

    // Check if PWA can be installed
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const updateSetting = async (key: string, value: string | boolean) => {
    // Update local state first for responsiveness
    if (key === "persistent_interval") setPersistentInterval(String(value));
    if (key === "notification_sound") setNotificationSound(Boolean(value));
    if (key === "notification_vibration")
      setNotificationVibration(Boolean(value));

    try {
      const response = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });

      if (response.ok) {
        toast.success("Configuração salva");
      } else {
        toast.error("Erro ao salvar configuração");
      }
    } catch (error) {
      console.error("Erro ao salvar configuração:", error);
      toast.error("Erro na conexão");
    }
  };

  async function handleInstallPWA() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      toast.success("App instalado com sucesso!");
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  }

  async function handleRemoveDevice(endpoint: string) {
    try {
      const response = await fetch(
        `/api/devices?endpoint=${encodeURIComponent(endpoint)}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        toast.success("Dispositivo removido");
        mutate();
      } else {
        toast.error("Erro ao remover dispositivo");
      }
    } catch {
      toast.error("Erro ao remover dispositivo");
    }
  }

  async function handleToggleNotifications() {
    if (notificationsEnabled) {
      // Can't revoke permission via JS, inform user
      toast.info(
        "Para desativar, remova a permissão nas configurações do navegador",
      );
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        toast.success("Notificações ativadas!");

        // Register for push
        const registration = await navigator.serviceWorker.ready;
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

        if (vapidPublicKey) {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });

          await fetch("/api/devices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: subscription.endpoint,
              p256dh: arrayBufferToBase64(subscription.getKey("p256dh")),
              auth: arrayBufferToBase64(subscription.getKey("auth")),
              user_agent: navigator.userAgent,
            }),
          });

          mutate();
        }
      } else {
        toast.error("Permissão negada");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao ativar notificações");
    }
  }

  const devices = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências e dispositivos
        </p>
      </div>

      {/* PWA Install */}
      {isInstallable && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Instalar Aplicativo</h3>
                  <p className="text-sm text-muted-foreground">
                    Adicione à tela inicial para acesso rápido
                  </p>
                </div>
              </div>
              <Button onClick={handleInstallPWA}>Instalar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificações
          </CardTitle>
          <CardDescription>
            Configure como você recebe lembretes das tarefas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FieldGroup>
            <Field className="flex items-center justify-between">
              <div>
                <FieldLabel className="mb-0">Notificações Push</FieldLabel>
                <p className="text-xs text-muted-foreground">
                  Receba lembretes mesmo com o navegador fechado
                </p>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={handleToggleNotifications}
              />
            </Field>

            <Separator />

            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Preferências de Alerta
              </h4>

              <Field className="flex items-center justify-between">
                <div>
                  <FieldLabel className="mb-0">Som</FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    Tocar som ao receber notificação
                  </p>
                </div>
                <Switch
                  checked={notificationSound}
                  onCheckedChange={(v) =>
                    updateSetting("notification_sound", v)
                  }
                />
              </Field>

              <Field className="flex items-center justify-between">
                <div>
                  <FieldLabel className="mb-0">Vibração</FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    Vibrar o dispositivo
                  </p>
                </div>
                <Switch
                  checked={notificationVibration}
                  onCheckedChange={(v) =>
                    updateSetting("notification_vibration", v)
                  }
                />
              </Field>

              <Separator />

              <div className="space-y-4 pt-2">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Notificações Persistentes
                </h4>
                <Field>
                  <FieldLabel htmlFor="interval-select">
                    Intervalo de Reenvio
                  </FieldLabel>
                  <Select
                    value={persistentInterval}
                    onValueChange={(v) =>
                      updateSetting("persistent_interval", v)
                    }
                  >
                    <SelectTrigger id="interval-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">A cada 15 minutos</SelectItem>
                      <SelectItem value="30">A cada 30 minutos</SelectItem>
                      <SelectItem value="60">A cada 1 hora</SelectItem>
                      <SelectItem value="120">A cada 2 horas</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Frequência com que as notificações não concluídas serão
                    reenviadas
                  </p>
                </Field>
              </div>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Aparência */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="w-5 h-5" />
            Aparência
          </CardTitle>
          <CardDescription>Personalize o visual do aplicativo</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="theme-select">Tema do Aplicativo</FieldLabel>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger
                  id="theme-select"
                  className="w-full sm:w-[200px]"
                >
                  <SelectValue placeholder="Selecione o tema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4" />
                      <span>Claro</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4" />
                      <span>Escuro</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      <span>Sistema</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Devices */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Dispositivos
              </CardTitle>
              <CardDescription>
                Dispositivos registrados para notificações
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BellOff className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Nenhum dispositivo registrado</p>
              <p className="text-sm">
                Ative as notificações para registrar este dispositivo
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">
                        {device.device_name || "Dispositivo"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Registrado em{" "}
                        {new Date(device.created_at).toLocaleDateString(
                          "pt-BR",
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={device.is_active ? "default" : "secondary"}>
                      {device.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleRemoveDevice(device.endpoint)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>Sobre</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>No Time PWA</p>
          <Separator />
          <p>Versão Beta 1.18</p>
          <p>Com suporte a notificações push e modo offline</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
