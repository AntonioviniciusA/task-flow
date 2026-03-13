// Service Worker para PWA com notificações push e suporte offline

const CACHE_NAME = "task-manager-v1";
const STATIC_ASSETS = ["/", "/manifest.json"];

// Instalação do Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

// Ativação e limpeza de caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
    }),
  );
  self.clients.claim();
});

// Estratégia de cache: Network First com fallback para cache
self.addEventListener("fetch", (event) => {
  // Ignorar requisições não-GET
  if (event.request.method !== "GET") return;

  // Ignorar requisições de API (devem sempre ir para a rede)
  if (event.request.url.includes("/api/")) return;

  // Ignorar requisições de extensões do Chrome ou outros esquemas não suportados
  if (!event.request.url.startsWith("http")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clonar a resposta para armazenar no cache
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Se offline, tentar buscar do cache
        return caches.match(event.request);
      }),
  );
});

// Receber notificações push
self.addEventListener("push", (event) => {
  console.log("[Service Worker] Notificação Push recebida");

  let data = {
    title: "Lembrete de Tarefa",
    body: "Você tem uma tarefa pendente",
    url: "/dashboard",
  };

  try {
    if (event.data) {
      const jsonData = event.data.json();
      data = { ...data, ...jsonData };
    }
  } catch (e) {
    console.warn(
      "[Service Worker] Erro ao processar JSON, usando texto puro:",
      e,
    );
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icon-light-32x32.png",
    badge: "/icon-light-32x32.png",
    vibrate: [200, 100, 200],
    tag: data.taskId || "task-notification",
    renotify: true,
    requireInteraction: true,
    data: {
      taskId: data.taskId,
      url: data.url || "/dashboard",
    },
    actions: [
      {
        action: "complete",
        title: "Concluir",
      },
      {
        action: "snooze",
        title: "Adiar",
      },
    ],
  };

  event.waitUntil(
    self.registration
      .showNotification(data.title, options)
      .then(() => console.log("[Service Worker] Notificação exibida"))
      .catch((err) => console.error("[Service Worker] Erro ao exibir:", err)),
  );
});

// Lidar com cliques nas notificações
self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  const action = event.action;
  const taskId = notification.data?.taskId;

  notification.close();

  if (action === "complete" && taskId) {
    // Marcar tarefa como concluída
    event.waitUntil(
      fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "completed" }),
      })
        .then(() => {
          // Mostrar notificação de confirmação
          return self.registration.showNotification("Tarefa Concluída", {
            body: "A tarefa foi marcada como concluída.",
            icon: "/icon-light-32x32.png",
            tag: "confirmation",
          });
        })
        .catch((error) => {
          console.error("Erro ao concluir tarefa:", error);
        }),
    );
  } else if (action === "snooze" && taskId) {
    // Abrir a página para adiar a tarefa
    event.waitUntil(clients.openWindow(`/tasks/${taskId}?snooze=true`));
  } else {
    // Clique na notificação sem ação específica - abrir o app
    event.waitUntil(
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((windowClients) => {
          // Se já há uma janela aberta, focar nela
          for (const client of windowClients) {
            if (client.url === "/" && "focus" in client) {
              return client.focus();
            }
          }
          // Caso contrário, abrir uma nova janela
          if (clients.openWindow) {
            return clients.openWindow(notification.data?.url || "/");
          }
        }),
    );
  }
});

// Fechamento da notificação
self.addEventListener("notificationclose", (event) => {
  // Analytics ou logging podem ser feitos aqui
  console.log("Notificação fechada:", event.notification.tag);
});

// Background Sync para operações offline
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-tasks") {
    event.waitUntil(syncTasks());
  }
});

async function syncTasks() {
  try {
    // Buscar operações pendentes do IndexedDB
    const db = await openIndexedDB();
    const pendingOps = await getAllPendingOperations(db);

    for (const op of pendingOps) {
      try {
        await fetch(op.url, {
          method: op.method,
          headers: op.headers,
          body: JSON.stringify(op.body),
        });
        await deletePendingOperation(db, op.id);
      } catch (error) {
        console.error("Erro ao sincronizar operação:", error);
      }
    }
  } catch (error) {
    console.error("Erro no background sync:", error);
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("task-manager-offline", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getAllPendingOperations(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["pendingSync"], "readonly");
    const store = transaction.objectStore("pendingSync");
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deletePendingOperation(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["pendingSync"], "readwrite");
    const store = transaction.objectStore("pendingSync");
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
