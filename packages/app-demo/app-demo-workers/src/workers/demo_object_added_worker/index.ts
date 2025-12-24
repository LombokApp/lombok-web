import { AppAPIError, type TaskHandler } from '@lombokapp/app-worker-sdk'
import { SignedURLsRequestMethod } from '@lombokapp/types'

export const handleTask: TaskHandler = async function handleTask(
  task,
  { serverClient },
) {
  if (!task.targetLocation?.objectKey) {
    throw new AppAPIError(
      'INVALID_TASK_DATA',
      'Missing target location or object key',
    )
  }
  const response = await serverClient.getContentSignedUrls([
    {
      folderId: task.targetLocation.folderId,
      objectKey: task.targetLocation.objectKey,
      method: SignedURLsRequestMethod.GET,
    },
  ])

  if ('error' in response) {
    throw new Error(response.error.message)
  }

  console.log('From within object_added worker:', {
    objectFetchUrl: response.result[0]?.url ?? '',
    envVars: process.env,
  })
}
