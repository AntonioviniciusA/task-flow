'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CreateTaskDialog } from './create-task-dialog'

export function CreateTaskButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Nova Tarefa</span>
      </Button>
      <CreateTaskDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
