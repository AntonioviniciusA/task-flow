import { Suspense } from 'react'
import { TaskList } from '@/components/task-list'
import { TaskListSkeleton } from '@/components/task-list-skeleton'
import { CreateTaskButton } from '@/components/create-task-button'
import { NotificationBanner } from '@/components/notification-banner'
import { AiTaskInput } from '@/components/ai-task-input'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Minhas Tarefas</h1>
          <p className="text-muted-foreground">Gerencie suas tarefas e receba lembretes</p>
        </div>
        <CreateTaskButton />
      </div>

      <AiTaskInput />

      <NotificationBanner />

      <Suspense fallback={<TaskListSkeleton />}>
        <TaskList />
      </Suspense>
    </div>
  )
}
