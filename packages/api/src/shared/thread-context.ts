import { AsyncLocalStorage } from 'node:async_hooks'

import { InternalServerErrorException } from '@nestjs/common'

interface RequestContext {
  threadId: string
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>()

export const runWithThreadContext = <T>(
  threadId: string,
  callback: () => T,
): T => requestContextStorage.run({ threadId }, callback)

export const getThreadId = () => {
  const threadId = requestContextStorage.getStore()?.threadId
  if (!threadId) {
    throw new InternalServerErrorException('Thread ID not found')
  }
  return threadId
}
