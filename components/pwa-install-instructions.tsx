"use client";

import { useState, useEffect } from "react";
import {
  Smartphone,
  Share,
  PlusSquare,
  MoreVertical,
  Download,
  Info,
  ChevronRight,
  Monitor,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PwaInstallInstructions() {
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform("ios");
    } else if (/android/.test(userAgent)) {
      setPlatform("android");
    } else {
      setPlatform("other");
    }
  }, []);

  return (
    <Card className="border-primary/20 bg-primary/5 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Download className="w-5 h-5 text-primary" />
          Instalar no seu Celular
        </CardTitle>
        <CardDescription>
          Tenha acesso rápido e notificações mais estáveis instalando como Aplicativo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={platform} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="ios" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              iPhone
            </TabsTrigger>
            <TabsTrigger value="android" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Android
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ios" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-sm">
                  Abra este site no navegador <span className="font-semibold">Safari</span>.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-sm flex items-center flex-wrap gap-1">
                  Toque no botão de <span className="font-semibold inline-flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-xs"><Share className="w-3 h-3" /> Compartilhar</span> na barra inferior.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">
                  3
                </div>
                <div className="text-sm flex items-center flex-wrap gap-1">
                  Role a lista e toque em <span className="font-semibold inline-flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-xs"><PlusSquare className="w-3 h-3" /> Adicionar à Tela de Início</span>.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">
                  4
                </div>
                <div className="text-sm">
                  Toque em <span className="font-semibold">Adicionar</span> no canto superior direito.
                </div>
              </div>
            </div>
            <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400">
              <Info className="h-4 w-4" />
              <AlertTitle className="text-xs font-bold">Importante</AlertTitle>
              <AlertDescription className="text-[10px]">
                No iPhone, as notificações só funcionam se você adicionar o app à tela de início.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="android" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-sm">
                  Abra este site no <span className="font-semibold">Google Chrome</span>.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-sm flex items-center flex-wrap gap-1">
                  Toque nos <span className="font-semibold inline-flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-xs"><MoreVertical className="w-3 h-3" /> três pontos</span> no canto superior direito.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">
                  3
                </div>
                <div className="text-sm flex items-center flex-wrap gap-1">
                  Toque em <span className="font-semibold inline-flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-xs"><Download className="w-3 h-3" /> Instalar Aplicativo</span>.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">
                  4
                </div>
                <div className="text-sm">
                  Confirme tocando em <span className="font-semibold">Instalar</span>.
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
