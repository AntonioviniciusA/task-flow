'use client'

import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { CheckIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer size-5 shrink-0 rounded-[6px] border border-neutral-200 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#007AFF] data-[state=checked]:border-[#007AFF] data-[state=checked]:text-white dark:border-neutral-800 dark:data-[state=checked]:bg-[#0A84FF] dark:data-[state=checked]:border-[#0A84FF]',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3.5 stroke-[3]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
