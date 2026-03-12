'use client'

import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Empty } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, CheckCircle, XCircle, Clock, MousePointer } from 'lucide-react'
import type { NotificationLog } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function NotificationsPage() {
  // Note: We would need to add an API endpoint for notification logs
  // For now, we'll show a placeholder
  const { data, isLoading } = useSWR<{ success: boolean; data: NotificationLog[] }>(
    '/api/notifications/logs',
    fetcher,
    { refreshInterval: 60000 }
  )

  const statusConfig = {
    sent: { label: 'Enviada', icon: Clock, color: 'bg-primary/20 text-primary' },
    delivered: { label: 'Entregue', icon: CheckCircle, color: 'bg-success/20 text-success' },
    failed: { label: 'Falhou', icon: XCircle, color: 'bg-destructive/20 text-destructive' },
    clicked: { label: 'Clicada', icon: MousePointer, color: 'bg-success/20 text-success' },
    dismissed: { label: 'Dispensada', icon: XCircle, color: 'bg-muted text-muted-foreground' },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
        <p className="text-muted-foreground">
          Histórico de notificações enviadas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Histórico
          </CardTitle>
          <CardDescription>
            Últimas notificações de lembretes de tarefas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : !data?.data?.length ? (
            <Empty
              icon={Bell}
              title="Nenhuma notificação"
              description="Quando você receber lembretes, eles aparecerão aqui"
            />
          ) : (
            <div className="space-y-3">
              {data.data.map((log) => {
                const config = statusConfig[log.status]
                const Icon = config.icon

                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                      <Bell className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        Lembrete de tarefa
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.sent_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Badge variant="secondary" className={config.color}>
                      <Icon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-muted">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted shrink-0">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                Como funcionam as notificações
              </p>
              <p>
                As notificações são enviadas automaticamente antes do horário agendado
                de cada tarefa. Você pode configurar quantos minutos antes deseja ser
                lembrado ao criar ou editar uma tarefa.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
