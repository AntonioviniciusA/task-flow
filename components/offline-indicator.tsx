'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showBadge, setShowBadge] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setShowBadge(true)
      setTimeout(() => setShowBadge(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowBadge(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showBadge && isOnline) return null

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300',
        showBadge ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      <Badge
        variant={isOnline ? 'default' : 'destructive'}
        className="gap-2 px-4 py-2 text-sm shadow-lg"
      >
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            Online
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            Offline
          </>
        )}
      </Badge>
    </div>
  )
}

interface SyncIndicatorProps {
  isSyncing: boolean
  pendingChanges?: number
}

export function SyncIndicator({ isSyncing, pendingChanges = 0 }: SyncIndicatorProps) {
  if (!isSyncing && pendingChanges === 0) return null

  return (
    <Badge variant="secondary" className="gap-2">
      {isSyncing ? (
        <>
          <RefreshCw className="w-3 h-3 animate-spin" />
          Sincronizando...
        </>
      ) : (
        <>{pendingChanges} pendentes</>
      )}
    </Badge>
  )
}
