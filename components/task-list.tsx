'use client'

import useSWR from 'swr'
import { TaskCard } from './task-card'
import { Empty } from '@/components/ui/empty'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Task, NetworkContext } from '@/lib/types'
import { ClipboardList, MapPin, Wifi } from 'lucide-react'
import { Badge } from './ui/badge'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function TaskList() {
  const { data, error, isLoading, mutate } = useSWR<{ success: boolean; data: Task[] }>(
    '/api/tasks',
    fetcher,
    { refreshInterval: 30000 }
  )

  const { data: contextData } = useSWR<{ context: string; ip: string }>(
    '/api/context',
    fetcher,
    { 
      refreshInterval: 300000, // 5 minutos de cache
      revalidateOnFocus: true 
    }
  )

  const { data: networkData } = useSWR<{ success: boolean; data: NetworkContext[] }>(
    '/api/settings/networks',
    fetcher
  )

  if (error) {
    return (
      <Empty
        icon={ClipboardList}
        title="Erro ao carregar tarefas"
        description="Não foi possível carregar suas tarefas. Tente novamente."
      />
    )
  }

  if (isLoading) {
    return null // Skeleton is shown by Suspense
  }

  const tasks = data?.data || []
  const currentContextSlug = contextData?.context || 'unknown'
  const networks = networkData?.data || []

  // Encontrar o ID da rede que corresponde ao contexto atual
  const activeNetwork = networks.find(n => n.context_slug === currentContextSlug)

  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress')
  const completedTasks = tasks.filter((t) => t.status === 'completed')

  // Filtrar tarefas contextuais (que combinam com o local atual)
  const contextualTasks = pendingTasks.filter(t => 
    t.network_context_id && t.network_context_id === activeNetwork?.id
  )
  
  // Outras tarefas (sem contexto ou de outros contextos)
  const otherTasks = pendingTasks.filter(t => 
    !t.network_context_id || t.network_context_id !== activeNetwork?.id
  )

  if (tasks.length === 0) {
    return (
      <Empty
        icon={ClipboardList}
        title="Nenhuma tarefa ainda"
        description="Crie sua primeira tarefa clicando no botão acima"
      />
    )
  }

  return (
    <div className="space-y-6">
      {currentContextSlug !== 'unknown' && activeNetwork && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#34C759]/10 border border-[#34C759]/20 animate-in fade-in slide-in-from-top-2">
          <Wifi className="w-4 h-4 text-[#34C759]" />
          <span className="text-sm font-medium text-[#34C759]">
            Você está em: <span className="font-bold">{activeNetwork.name}</span>
          </span>
          <Badge variant="outline" className="ml-auto bg-white/50 border-[#34C759]/20 text-[#34C759]">
            Contexto: {activeNetwork.context_slug}
          </Badge>
        </div>
      )}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            Pendentes
            {pendingTasks.length > 0 && (
              <span className="bg-[#007AFF]/20 text-[#007AFF] text-xs px-2 py-0.5 rounded-full">
                {pendingTasks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            Concluídas
            {completedTasks.length > 0 && (
              <span className="bg-neutral-200 text-neutral-600 text-xs px-2 py-0.5 rounded-full">
                {completedTasks.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6">
          {pendingTasks.length === 0 ? (
            <Empty
              icon={ClipboardList}
              title="Tudo em dia!"
              description="Você não tem tarefas pendentes"
            />
          ) : (
            <>
              {contextualTasks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <MapPin className="w-4 h-4 text-[#007AFF]" />
                    <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
                      Prioridade para este local
                    </h3>
                  </div>
                  {contextualTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onUpdate={() => mutate()} />
                  ))}
                </div>
              )}

              {otherTasks.length > 0 && (
                <div className="space-y-3">
                  {contextualTasks.length > 0 && (
                    <div className="flex items-center gap-2 px-1 pt-2">
                      <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
                        Outras Tarefas
                      </h3>
                    </div>
                  )}
                  {otherTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onUpdate={() => mutate()} />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3">
          {completedTasks.length === 0 ? (
            <Empty
              icon={ClipboardList}
              title="Nenhuma tarefa concluída"
              description="Complete suas tarefas para vê-las aqui"
            />
          ) : (
            completedTasks.map((task) => (
              <TaskCard key={task.id} task={task} onUpdate={() => mutate()} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
