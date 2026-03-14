"use client";

import { useEffect } from "react";

export function WorkerTrigger() {
  useEffect(() => {
    // Função para chamar o worker
    const triggerWorker = async () => {
      try {
        // Agora chama a nova rota de check-tasks. 
        // Nota: Esta chamada via browser não terá o Bearer Token, 
        // mas em desenvolvimento podemos permitir ou apenas ignorar o erro 401.
        await fetch("/api/check-tasks");
      } catch (error) {
        // Silencioso em produção, apenas para manter o cron rodando
        console.error("Worker trigger failed", error);
      }
    };

    // Chama ao carregar e quando a aba volta a ficar visível
    triggerWorker();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerWorker();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Tenta registrar um Periodic Sync se o navegador suportar (Chrome/Android)
    if ("serviceWorker" in navigator && "periodicSync" in (navigator as any)) {
      navigator.serviceWorker.ready.then(async (registration: any) => {
        try {
          await registration.periodicSync.register("task-worker", {
            minInterval: 60 * 1000, // 1 minuto
          });
        } catch (e) {
          console.log(
            "Periodic Sync não pôde ser registrado, usando setInterval como fallback.",
          );
        }
      });
    }

    // Configura o intervalo de 60 segundos (enquanto a aba estiver aberta)
    const interval = setInterval(triggerWorker, 60000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
