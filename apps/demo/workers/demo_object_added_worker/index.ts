import type { TaskHandler } from '@lombokapp/app-worker-sdk'
import { SignedURLsRequestMethod } from '@lombokapp/types'

export const handleTask: TaskHandler = async function handleTask(
  { task },
  { serverClient },
) {
  const response = await serverClient.getContentSignedUrls([
    {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      folderId: task.subjectFolderId!,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      objectKey: task.subjectObjectKey!,
      method: SignedURLsRequestMethod.GET,
    },
  ])

  console.log('From within object_added worker:', {
    objectFetchUrl: response.result[0],
    envVars: process.env,
  })
}
