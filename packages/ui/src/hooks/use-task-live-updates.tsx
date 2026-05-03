import type { QueryKey } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

import type { SocketMessageHandler } from '@/src/contexts/server'
import { useServerContext } from '@/src/contexts/server'

const TASK_UPDATE_CODE_PREFIX = 'platform:tasks:'

export const useTaskLiveUpdates = (
  taskId: string | undefined,
  queryKey: QueryKey,
) => {
  const { subscribeToMessages, unsubscribeFromMessages } = useServerContext()
  const queryClient = useQueryClient()

  React.useEffect(() => {
    if (!taskId) {
      return
    }

    const handler: SocketMessageHandler = (name, payload) => {
      if (!name.startsWith(TASK_UPDATE_CODE_PREFIX)) {
        return
      }
      const inner = payload.data
      const messageTaskId =
        inner && typeof inner === 'object' && 'taskId' in inner
          ? (inner as { taskId?: unknown }).taskId
          : undefined
      if (messageTaskId !== taskId) {
        return
      }
      void queryClient.invalidateQueries({ queryKey })
    }

    subscribeToMessages(handler)
    return () => unsubscribeFromMessages(handler)
  }, [
    taskId,
    queryKey,
    queryClient,
    subscribeToMessages,
    unsubscribeFromMessages,
  ])
}
