import { RequestHandler, sendResponse } from '@stellariscloud/app-worker-sdk'
import { SignedURLsRequestMethod } from '@stellariscloud/types'

export const handleRequest: RequestHandler = async function handleRequest(
  request,
  { serverClient },
) {
  console.log(
    'DEMO API REQUEST WORKER REQUEST HANDLER:',
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

  return sendResponse(
    {
      message: 'Hello, world (from demo API request worker)!',
    },
    200,
  )
}
