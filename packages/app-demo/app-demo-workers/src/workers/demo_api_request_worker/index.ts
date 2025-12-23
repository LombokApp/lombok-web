import type { RequestHandler } from '@lombokapp/app-worker-sdk'

export const handleRequest: RequestHandler = async function handleRequest(
  request,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  { serverClient, dbClient, actor },
) {
  console.log(
    'DEMO API REQUEST WORKER REQUEST HANDLER:',
    new URL(request.url).pathname,
  )

  if (actor?.actorType === 'system') {
    console.log('System request')
  } else if (actor?.actorType === 'user') {
    console.log('User request:', actor.userId)
  } else {
    console.log('Unauthenticated request')
  }

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
        const bodyData = (await request.json()) as unknown
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

  // Test database connection with a simple query
  try {
    console.log('Testing database connection...')
    const result = await dbClient.query(
      'SELECT NOW() as current_time, current_database() as database_name',
    )
    console.log('Database query result:', result)

    // Try to query the demo tables if they exist
    try {
      const usersResult = await dbClient.query(
        'SELECT COUNT(*) as user_count FROM users',
      )
      console.log('Users table query result:', usersResult)
    } catch (error) {
      console.log('Users table not found or not accessible:', error)
    }
  } catch (error) {
    console.log('Database query failed:', error)
  }

  return new Response(
    JSON.stringify({
      message: 'Hello, world (from demo API request worker)!',
      timestamp: new Date().toISOString(),
      databaseTest: 'Database client is available and working',
    }),
    {
      status: 200,
    },
  )
}
