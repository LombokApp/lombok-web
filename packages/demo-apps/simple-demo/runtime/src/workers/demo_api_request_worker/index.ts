import type { RequestHandler } from '@lombokapp/app-worker-sdk'

export const handleRequest: RequestHandler = async function handleRequest(
  request,
  { serverClient, actor },
) {
  const url = new URL(request.url)
  console.log('DEMO API REQUEST WORKER:', url.pathname)

  // ---- /trigger-tasks endpoint ----
  // Triggers N demo_async_task tasks with generated correlationKeys,
  // returns the correlationKeys so the caller can filter socket events.
  if (url.pathname.endsWith('/trigger-tasks') && request.method === 'POST') {
    if (actor?.actorType !== 'user') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      })
    }

    const body = (await request.json()) as { count?: number }
    const count = Math.min(body.count ?? 3, 10) // cap at 10

    const correlationKeys: string[] = []

    for (let i = 0; i < count; i++) {
      const correlationKey = crypto.randomUUID()
      correlationKeys.push(correlationKey)

      await serverClient.triggerAppTask({
        taskIdentifier: 'demo_async_task',
        inputData: { label: `Task ${i + 1}` },
        correlationKey,
        targetUserId: actor.userId,
      })
    }

    return new Response(JSON.stringify({ correlationKeys }), { status: 200 })
  }

  // ---- Default handler ----
  return new Response(
    JSON.stringify({
      message: 'Hello, world (from demo API request worker)!',
      timestamp: new Date().toISOString(),
    }),
    { status: 200 },
  )
}
