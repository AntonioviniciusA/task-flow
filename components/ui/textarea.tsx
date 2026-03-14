import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-neutral-200 bg-white px-4 py-3 text-base shadow-sm transition-all duration-200 placeholder:text-neutral-400 outline-none min-h-24 w-full rounded-xl border font-normal disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500',
        'focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/10 dark:focus:border-[#0A84FF] dark:focus:ring-[#0A84FF]/20',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
