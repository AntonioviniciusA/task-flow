import { Loader2Icon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface SpinnerProps extends React.ComponentProps<'svg'> {
  size?: 'sm' | 'md' | 'lg' | number
}

function Spinner({ className, size = 'md', ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: 'size-4',
    md: 'size-6',
    lg: 'size-8',
  }

  const numericSize = typeof size === 'number' ? size : undefined
  const classSize = typeof size === 'string' ? sizeClasses[size] : ''

  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn('animate-spin', classSize, className)}
      size={numericSize}
      {...props}
    />
  )
}

export { Spinner }
