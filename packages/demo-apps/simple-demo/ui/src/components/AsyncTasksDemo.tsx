import { useAppBrowserSdk } from '@lombokapp/app-browser-sdk'
import React from 'react'
import { io, type Socket } from 'socket.io-client'

interface TaskState {
  correlationKey: string
  label: string
  percent: number
  current: number
  total: number
  messages: string[]
  done: boolean
}

interface AsyncUpdatePayload {
  correlationKey: string | null
  progress?: {
    percent?: number
    current?: number
    total?: number
    label?: string
  }
  message?: { level: string; text: string; audience: string }
}

export function AsyncTasksDemo() {
  const { isInitialized, authState, getAccessToken, executeWorkerScriptUrl } =
    useAppBrowserSdk()

  const [tasks, setTasks] = React.useState<Map<string, TaskState>>(new Map())
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string>()
  const [socketConnected, setSocketConnected] = React.useState(false)
  const socketRef = React.useRef<Socket | null>(null)
  const trackedKeysRef = React.useRef<Set<string>>(new Set())

  // Connect to the /app-user socket once we have an access token
  React.useEffect(() => {
    if (!isInitialized || !authState.isAuthenticated) {
      return
    }

    let cancelled = false
    void (async () => {
      const token = await getAccessToken()
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- set in cleanup
      if (cancelled) {
        return
      }

      const socket = io('/app-user', {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
      })

      socket.on('connect', () => setSocketConnected(true))
      socket.on('disconnect', () => setSocketConnected(false))

      socket.on('ASYNC_UPDATE', (data: AsyncUpdatePayload) => {
        if (!data.correlationKey) {
          return
        }
        if (!trackedKeysRef.current.has(data.correlationKey)) {
          return
        }

        const key = data.correlationKey
        setTasks((prev) => {
          const next = new Map(prev)
          const existing = next.get(key)
          if (!existing) {
            return prev
          }

          const updated: TaskState = { ...existing }
          if (data.progress) {
            updated.percent = data.progress.percent ?? updated.percent
            updated.current = data.progress.current ?? updated.current
            updated.total = data.progress.total ?? updated.total
            if (data.progress.label) {
              updated.label = data.progress.label
            }
            if (
              updated.percent >= 100 ||
              (updated.total > 0 && updated.current >= updated.total)
            ) {
              updated.done = true
            }
          }
          if (data.message?.text) {
            updated.messages = [...updated.messages, data.message.text]
          }
          next.set(key, updated)
          return next
        })
      })

      socketRef.current = socket
    })()

    return () => {
      cancelled = true
      socketRef.current?.disconnect()
      socketRef.current = null
      setSocketConnected(false)
    }
  }, [isInitialized, authState.isAuthenticated, getAccessToken])

  const handleRunTasks = () => {
    setLoading(true)
    setError(undefined)
    void (async () => {
      try {
        const response = await executeWorkerScriptUrl(
          {
            workerIdentifier: 'demo_api_request_worker',
            url: '/trigger-tasks',
          },
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count: 3 }),
          },
        )

        if (!response.ok) {
          setError(`HTTP ${response.status}: ${response.statusText}`)
          return
        }

        const { correlationKeys } = (await response.json()) as {
          correlationKeys: string[]
        }

        // Seed task state and register keys for filtering
        const newTasks = new Map<string, TaskState>()
        correlationKeys.forEach((ck, i) => {
          trackedKeysRef.current.add(ck)
          newTasks.set(ck, {
            correlationKey: ck,
            label: `Task ${i + 1}`,
            percent: 0,
            current: 0,
            total: 0,
            messages: [],
            done: false,
          })
        })
        setTasks(newTasks)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    })()
  }

  if (!isInitialized) {
    return (
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
        <div className="flex items-center space-x-2">
          <div className="size-4 animate-spin rounded-full border-b-2 border-blue-400" />
          <span className="text-blue-400">Initializing SDK...</span>
        </div>
      </div>
    )
  }

  const allDone = tasks.size > 0 && [...tasks.values()].every((t) => t.done)

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">Async Tasks Demo</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            socketConnected
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {socketConnected ? 'Socket connected' : 'Socket disconnected'}
        </span>
      </div>

      <p className="mb-4 text-sm text-white/60">
        Triggers multiple backend tasks, each tagged with a generated
        correlation&nbsp;ID. The connected socket receives all{' '}
        <code className="text-white/80">ASYNC_UPDATE</code> events for the user
        scope and the UI filters them by correlation&nbsp;ID to render per-task
        progress.
      </p>

      <button
        onClick={handleRunTasks}
        disabled={loading || !authState.isAuthenticated || !socketConnected}
        className="mb-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center space-x-2">
            <span className="size-4 animate-spin rounded-full border-b-2 border-white" />
            <span>Triggering tasks...</span>
          </span>
        ) : (
          'Run 3 Async Tasks'
        )}
      </button>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {tasks.size > 0 && (
        <div className="space-y-3">
          {[...tasks.values()].map((t) => (
            <div
              key={t.correlationKey}
              className="rounded-lg border border-white/10 bg-black/20 p-4"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-white">
                  {t.label}
                </span>
                <span className="text-xs text-white/50">
                  {t.done ? 'Done' : `${t.percent}%`}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    t.done
                      ? 'bg-green-500'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500'
                  }`}
                  style={{ width: `${t.percent}%` }}
                />
              </div>

              {/* Latest message */}
              {t.messages.length > 0 && (
                <p className="text-xs text-white/40">
                  {t.messages[t.messages.length - 1]}
                </p>
              )}

              {/* Correlation key */}
              <p className="mt-1 font-mono text-[10px] text-white/25">
                {t.correlationKey}
              </p>
            </div>
          ))}

          {allDone && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-center text-sm text-green-400">
              All tasks completed!
            </div>
          )}
        </div>
      )}
    </div>
  )
}
