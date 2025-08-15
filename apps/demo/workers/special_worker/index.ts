import {
  RequestHandler,
  sendResponse,
  TaskHandler,
} from '@stellariscloud/app-worker-sdk'

export const handleTask: TaskHandler = async function handleTask(
  task,
  { serverClient },
) {
  const urls = await serverClient.getContentSignedUrls([
    {
      folderId: 'b85646a9-3c5c-40c6-afe8-6035fdb827da',
      objectKey: 'testobjectkey',
      method: 'GET',
    },
  ])

  console.log('From inside worker task handler:', {
    generatedPresignedUrls: urls,
    envVars: process.env,
  })
}

export const handleRequest: RequestHandler = async function handleRequest(
  request,
  { serverClient },
) {
  console.log(
    'SPECIAL THING WORKER REQUEST HANDLER:',
    new URL(request.url).pathname,
  )

  // Log detailed request information
  const headersObj: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headersObj[key] = value
  })

  console.log('Request details:', {
    method: request.method,
    url: request.url,
    headers: headersObj,
    hasBody: request.body !== null,
  })

  // Log body content if present (for debugging purposes)
  if (request.body) {
    try {
      const contentType = request.headers.get('Content-Type') || ''
      if (contentType.includes('application/json')) {
        const bodyData = await request.json()
        console.log('Request JSON body:', bodyData)
      } else if (contentType.includes('text/')) {
        const bodyText = await request.text()
        console.log('Request text body:', bodyText)
      } else {
        console.log('Request has body with content-type:', contentType)
      }
    } catch (error) {
      console.log('Could not parse request body:', error)
    }
  }

  const urls = await serverClient.getContentSignedUrls([
    {
      folderId: 'b85646a9-3c5c-40c6-afe8-6035fdb827da',
      objectKey: 'testobjectkey',
      method: 'GET',
    },
  ])
  console.log('From inside worker request handler:', {
    generatedPresignedUrls: urls,
    envVars: process.env,
  })

  return sendResponse(
    {
      message: 'Hello, world (from special worker)!',
    },
    201,
  )
}
