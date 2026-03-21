"use client";

import { useEffect } from "react";

export function WorkerTrigger() {
  useEffect(() => {
    let lastRun = 0;
    const MIN_INTERVAL = 60000; // 1 minuto de intervalo mínimo entre triggers manuais/visibilidade

    const triggerWorker = async (force = false) => {
      const now = Date.now();
      if (!force && now - lastRun < MIN_INTERVAL) {
        return;
      }
      
      lastRun = now;
      try {
        await fetch("/api/check-tasks");
      } catch (error) {
        console.error("Worker trigger failed", error);
      }
    };

    // Chama ao carregar
    triggerWorker(true);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerWorker();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Tenta registrar um Periodic Sync
    if ("serviceWorker" in navigator && "periodicSync" in (navigator as any)) {
      navigator.serviceWorker.ready.then(async (registration: any) => {
        try {
          await registration.periodicSync.register("task-worker", {
            minInterval: 5 * 60 * 1000,
          });
        } catch (e) {
          // Fallback silencioso
        }
      });
    }

    // Intervalo de 5 minutos
    const interval = setInterval(() => triggerWorker(true), 300000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
