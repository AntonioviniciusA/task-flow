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
  Music,
  User as UserIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import type { Device } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { PwaInstallInstructions } from "@/components/pwa-install-instructions";
import { signOut } from "next-auth/react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const SOUNDS = [
  { label: "Padrão", value: "default" },
  { label: "Suave", value: "soft" },
  { label: "Energético", value: "energetic" },
  { label: "Alerta", value: "alert" },
  { label: "Digital", value: "digital" },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { data, mutate } = useSWR<{ success: boolean; data: Device[] }>(
    "/api/devices",
    fetcher,
  );
  const devices = data?.data ?? [];

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [persistentInterval, setPersistentInterval] = useState("60");
  const [notificationSound, setNotificationSound] = useState(true);
  const [notificationVibration, setNotificationVibration] = useState(true);
  const [soundLow, setSoundLow] = useState("default");
  const [soundMedium, setSoundMedium] = useState("default");
  const [soundHigh, setSoundHigh] = useState("default");
  const [isPublicProfile, setIsPublicProfile] = useState(true);

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
            setSoundLow(result.data.sound_low || "default");
            setSoundMedium(result.data.sound_medium || "default");
            setSoundHigh(result.data.sound_high || "default");
            setIsPublicProfile(result.data.is_public !== false);
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
    if (key === "sound_low") setSoundLow(String(value));
    if (key === "sound_medium") setSoundMedium(String(value));
    if (key === "sound_high") setSoundHigh(String(value));
    if (key === "is_public") setIsPublicProfile(Boolean(value));

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
    if (
      !confirm(
        "Tem certeza que deseja remover este dispositivo? As notificações push deixarão de funcionar nele.",
      )
    )
      return;

    try {
      const response = await fetch(
        `/api/devices?endpoint=${encodeURIComponent(endpoint)}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        toast.success("Dispositivo removido");

        // Se o dispositivo removido for este mesmo, deslogar para garantir segurança
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          const currentSubscription =
            await registration?.pushManager.getSubscription();

          if (currentSubscription?.endpoint === endpoint) {
            toast.info("Este dispositivo foi removido. Deslogando...");
            setTimeout(() => signOut({ callbackUrl: "/login" }), 2000);
            return;
          }
        } catch (swError) {
          console.error("Erro ao verificar service worker:", swError);
        }

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
            applicationServerKey: urlBase64ToUint8Array(
              vapidPublicKey,
            ) as BufferSource,
          });

          await fetch("/api/devices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: subscription.endpoint,
              p256dh: arrayBufferToBase64(subscription.getKey("p256dh")),
              auth: arrayBufferToBase64(subscription.getKey("auth")),
              user_agent: navigator.userAgent,
              device_name: getDeviceName(),
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

  async function handleTestNotification() {
    try {
      const response = await fetch("/api/check-tasks");
      if (response.ok) {
        toast.success("Comando de verificação enviado!");
      } else {
        toast.error("Erro ao disparar verificação");
      }
    } catch (error) {
      toast.error("Falha na conexão");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências e dispositivos
        </p>
      </div>

      {/* PWA Install Instructions */}
      <PwaInstallInstructions />

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

            {notificationsEnabled && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={handleTestNotification}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Testar Notificações Agora
                </Button>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Isso forçará o sistema a verificar tarefas pendentes e enviar
                  alertas.
                </p>
              </div>
            )}

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

              {notificationSound && (
                <div className="pl-4 space-y-4 border-l-2 border-primary/20 animate-in fade-in slide-in-from-left-2">
                  <Field>
                    <FieldLabel className="text-xs">
                      Prioridade Baixa
                    </FieldLabel>
                    <Select
                      value={soundLow}
                      onValueChange={(v) => updateSetting("sound_low", v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <Music className="w-3 h-3 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOUNDS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel className="text-xs">
                      Prioridade Média
                    </FieldLabel>
                    <Select
                      value={soundMedium}
                      onValueChange={(v) => updateSetting("sound_medium", v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <Music className="w-3 h-3 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOUNDS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel className="text-xs font-semibold text-destructive">
                      Prioridade Alta
                    </FieldLabel>
                    <Select
                      value={soundHigh}
                      onValueChange={(v) => updateSetting("sound_high", v)}
                    >
                      <SelectTrigger className="h-8 text-xs border-destructive/20">
                        <Music className="w-3 h-3 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOUNDS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              )}

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

      {/* Privacidade e Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            Privacidade e Perfil
          </CardTitle>
          <CardDescription>
            Controle quem pode ver seu progresso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field className="flex items-center justify-between">
              <div>
                <FieldLabel className="mb-0 flex items-center gap-2">
                  {isPublicProfile ? (
                    <Eye className="w-4 h-4 text-primary" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  )}
                  Perfil Público
                </FieldLabel>
                <p className="text-xs text-muted-foreground">
                  {isPublicProfile
                    ? "Seu perfil aparece no ranking global"
                    : "Seu perfil está oculto no ranking"}
                </p>
              </div>
              <Switch
                checked={isPublicProfile}
                onCheckedChange={(v) => updateSetting("is_public", v)}
              />
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
          <p>Versão Beta 1.3</p>
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

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "Android Device";
  if (/iPad|iPhone|iPod/.test(ua)) return "iOS Device";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Linux/i.test(ua)) return "Linux Device";
  return "Unknown Device";
}
