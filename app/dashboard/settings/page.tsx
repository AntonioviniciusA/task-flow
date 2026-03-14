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
  Wifi,
  Plus,
  MapPin,
} from "lucide-react";
import type { Device, NetworkContext } from "@/lib/types";
import { Input } from "@/components/ui/input";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { data, mutate } = useSWR<{ success: boolean; data: Device[] }>(
    "/api/devices",
    fetcher,
  );
  const { data: networkData, mutate: mutateNetworks } = useSWR<{
    success: boolean;
    data: NetworkContext[];
  }>("/api/settings/networks", fetcher);
  const { data: contextData } = useSWR<{ context: string; ip: string }>(
    "/api/context",
    fetcher,
  );

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [isAddingNetwork, setIsAddingNetwork] = useState(false);
  const [newNetwork, setNewNetwork] = useState({
    name: "",
    ip_range: "",
    context_slug: "home",
  });

  useEffect(() => {
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

  async function handleAddNetwork() {
    if (!newNetwork.name || !newNetwork.ip_range) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      const response = await fetch("/api/settings/networks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNetwork),
      });

      if (response.ok) {
        toast.success("Rede adicionada!");
        setNewNetwork({ name: "", ip_range: "", context_slug: "home" });
        setIsAddingNetwork(false);
        mutateNetworks();
      } else {
        toast.error("Erro ao adicionar rede");
      }
    } catch {
      toast.error("Erro ao adicionar rede");
    }
  }

  async function handleRemoveNetwork(id: string) {
    try {
      const response = await fetch("/api/settings/networks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        toast.success("Rede removida");
        mutateNetworks();
      } else {
        toast.error("Erro ao remover rede");
      }
    } catch {
      toast.error("Erro ao remover rede");
    }
  }

  const devices = data?.data || [];
  const networks = networkData?.data || [];
  const currentIp = contextData?.ip || "";

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
        <CardContent>
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

      {/* Redes Conhecidas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                Redes Conhecidas
              </CardTitle>
              <CardDescription>
                Defina contextos baseados na rede Wi-Fi/IP atual
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingNetwork(!isAddingNetwork)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAddingNetwork && (
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Nome da Rede</FieldLabel>
                  <Input
                    placeholder="Ex: Wi-Fi de Casa"
                    value={newNetwork.name}
                    onChange={(e) =>
                      setNewNetwork({ ...newNetwork, name: e.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel>IP ou Range CIDR</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: 192.168.0.0/24"
                      value={newNetwork.ip_range}
                      onChange={(e) =>
                        setNewNetwork({
                          ...newNetwork,
                          ip_range: e.target.value,
                        })
                      }
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setNewNetwork({ ...newNetwork, ip_range: currentIp })
                      }
                    >
                      Meu IP
                    </Button>
                  </div>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Contexto</FieldLabel>
                  <Select
                    value={newNetwork.context_slug}
                    onValueChange={(v) =>
                      setNewNetwork({ ...newNetwork, context_slug: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Casa</SelectItem>
                      <SelectItem value="work">Trabalho</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setIsAddingNetwork(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleAddNetwork}>Salvar Rede</Button>
              </div>
            </div>
          )}

          {networks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-xl">
              <p>Nenhuma rede cadastrada</p>
              <p className="text-xs">
                Adicione sua rede atual para ativar o contexto
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {networks.map((net) => (
                <div
                  key={net.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-neutral-100 dark:border-neutral-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{net.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {net.ip_range}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="capitalize">
                      {net.context_slug}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveNetwork(net.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentIp && (
            <p className="text-xs text-center text-muted-foreground pt-2">
              Seu IP atual detectado:{" "}
              <span className="font-mono">{currentIp}</span>
            </p>
          )}
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
