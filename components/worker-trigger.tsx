"use client";

import { useEffect } from "react";

export function WorkerTrigger() {
  useEffect(() => {
    // Função para chamar o worker
    const triggerWorker = async () => {
      try {
        await fetch("/api/worker");
      } catch (error) {
        // Silencioso em produção, apenas para manter o cron rodando
        console.error("Worker trigger failed", error);
      }
    };

    // Chama imediatamente ao carregar
    triggerWorker();

    // Configura o intervalo de 60 segundos
    const interval = setInterval(triggerWorker, 60000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
