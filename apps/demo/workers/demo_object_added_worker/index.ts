import { TaskHandler } from '@stellariscloud/app-worker-sdk'
import { SignedURLsRequestMethod } from '@stellariscloud/types'

export const handleTask: TaskHandler = async function handleTask(
  task,
  { serverClient },
) {
  const response = await serverClient.getContentSignedUrls([
    {
      folderId: task.subjectFolderId,
      objectKey: task.subjectObjectKey,
      method: SignedURLsRequestMethod.GET,
    },
  ])

  console.log('From within object_added worker:', {
    objectFetchUrl: response.result.urls[0],
    envVars: process.env,
  })
}
