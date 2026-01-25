import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@lombokapp/ui-toolkit/components/alert-dialog/alert-dialog'
import {
  Badge,
  BadgeVariant,
} from '@lombokapp/ui-toolkit/components/badge/badge'
import {
  Button,
  buttonVariants,
} from '@lombokapp/ui-toolkit/components/button/button'
import { CardHeader, CardTitle } from '@lombokapp/ui-toolkit/components/card'
import { Card } from '@lombokapp/ui-toolkit/components/card/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@lombokapp/ui-toolkit/components/dialog'
import { Input } from '@lombokapp/ui-toolkit/components/input/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lombokapp/ui-toolkit/components/select/select'
import { cn } from '@lombokapp/ui-toolkit/utils'
import { formatBytes } from '@lombokapp/utils'
import { Play, RefreshCcw, RotateCw, Square, Trash2 } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router'

import { DateDisplay } from '@/src/components/date-display'
import { EmptyState } from '@/src/components/empty-state/empty-state'
import { $api } from '@/src/services/api'

import type {
  DockerContainerGpuInfo,
  DockerContainerStats,
  DockerHostContainerState,
  DockerHostState,
} from './server-docker.types'

const ROW_CLASS =
  'grid grid-cols-1 gap-2 border-b border-muted/30 py-3 last:border-b-0 sm:grid-cols-3'
const LABEL_CLASS =
  'text-xs font-semibold uppercase tracking-wide text-muted-foreground'
const VALUE_CLASS = 'text-sm'

const PURGE_DURATION_OPTIONS = ['1h', '6h', '12h', '24h'] as const
const LOG_TAIL_OPTIONS = [100, 200, 500, 1000, 2000] as const

const renderStateBadge = (state: DockerHostContainerState['state']) => {
  const variant =
    state === 'running'
      ? BadgeVariant.secondary
      : state === 'exited'
        ? BadgeVariant.destructive
        : BadgeVariant.outline

  return (
    <Badge variant={variant} className="text-xs capitalize">
      {state}
    </Badge>
  )
}

export function ServerDockerContainerDetailScreen({
  hostId,
  containerId,
}: {
  hostId: string
  containerId: string
}) {
  const navigate = useNavigate()
  const [tail, setTail] = React.useState(200)
  const [jobTail, setJobTail] = React.useState(200)
  const [selectedJobId, setSelectedJobId] = React.useState<string>()
  const [jobDialogOpen, setJobDialogOpen] = React.useState(false)
  const [startDialogOpen, setStartDialogOpen] = React.useState(false)
  const [stopDialogOpen, setStopDialogOpen] = React.useState(false)
  const [restartDialogOpen, setRestartDialogOpen] = React.useState(false)
  const [purgeDialogOpen, setPurgeDialogOpen] = React.useState(false)
  const [selectedWorkerId, setSelectedWorkerId] = React.useState<string>()
  const [workerDialogOpen, setWorkerDialogOpen] = React.useState(false)
  const [purgeDuration, setPurgeDuration] = React.useState('6h')
  const [purgeMessage, setPurgeMessage] = React.useState<string>()

  const stateQuery = $api.useQuery('get', '/api/v1/server/docker-hosts/state')

  const container = React.useMemo(() => {
    const host = stateQuery.data?.hosts.find((entry) => entry.id === hostId)
    const found = host?.containers.find((entry) => entry.id === containerId)
    return { host, container: found }
  }, [containerId, hostId, stateQuery.data])

  const logsQuery = $api.useQuery(
    'get',
    '/api/v1/server/docker-hosts/{hostId}/containers/{containerId}/logs',
    {
      params: {
        path: { hostId, containerId },
        query: {
          tail,
        },
      },
    },
  )

  const statsQuery = $api.useQuery(
    'get',
    '/api/v1/server/docker-hosts/{hostId}/containers/{containerId}/stats',
    {
      params: {
        path: { hostId, containerId },
      },
    },
  )

  const inspectQuery = $api.useQuery(
    'get',
    '/api/v1/server/docker-hosts/{hostId}/containers/{containerId}/inspect',
    {
      params: {
        path: { hostId, containerId },
      },
    },
  )

  const workersQuery = $api.useQuery(
    'get',
    '/api/v1/server/docker-hosts/{hostId}/containers/{containerId}/workers',
    {
      params: {
        path: { hostId, containerId },
      },
    },
  )

  const workerDetailQuery = $api.useQuery(
    'get',
    '/api/v1/server/docker-hosts/{hostId}/containers/{containerId}/workers/{workerId}',
    {
      params: {
        path: { hostId, containerId, workerId: selectedWorkerId ?? '' },
        query: {
          limit: 20,
        },
      },
    },
    {
      enabled: workerDialogOpen && !!selectedWorkerId,
      refetchOnWindowFocus: false,
    },
  )

  const purgeJobsMutation = $api.useMutation(
    'post',
    '/api/v1/server/docker-hosts/{hostId}/containers/{containerId}/purge-jobs',
  )

  const jobsQuery = $api.useQuery(
    'get',
    '/api/v1/server/docker-hosts/{hostId}/containers/{containerId}/jobs',
    {
      params: {
        path: { hostId, containerId },
        query: {
          limit: 20,
        },
      },
    },
  )

  const jobDetailQuery = $api.useQuery(
    'get',
    '/api/v1/server/docker-hosts/{hostId}/containers/{containerId}/jobs/{jobId}',
    {
      params: {
        path: { hostId, containerId, jobId: selectedJobId ?? '' },
        query: {
          tail: jobTail,
        },
      },
    },
    {
      enabled: jobDialogOpen && !!selectedJobId,
      refetchOnWindowFocus: false,
    },
  )

  const handleOpenJob = (jobId: string) => {
    setSelectedJobId(jobId)
    setJobDialogOpen(true)
  }

  const handleOpenWorker = (workerId: string) => {
    setSelectedWorkerId(workerId)
    setWorkerDialogOpen(true)
  }

  const handlePurgeJobs = async () => {
    setPurgeMessage(undefined)
    try {
      const response = await purgeJobsMutation.mutateAsync({
        params: {
          path: { hostId, containerId },
          query: {
            olderThan: purgeDuration.trim() || undefined,
          },
        },
      })
      setPurgeMessage(response.message)
    } catch {
      // error displayed via mutation state
    }
  }

  const purgeJobsErrorMessage = React.useMemo(() => {
    const error = purgeJobsMutation.error
    if (error instanceof Error && error.message) {
      return error.message
    }
    if (typeof error === 'string' && (error as string).length) {
      return error
    }
    return 'Failed to purge jobs.'
  }, [purgeJobsMutation.error])

  React.useEffect(() => {
    if (!jobsQuery.data?.jobs.length) {
      if (typeof selectedJobId !== 'undefined') {
        setSelectedJobId(undefined)
      }
      if (jobDialogOpen) {
        setJobDialogOpen(false)
      }
      return
    }

    if (
      !selectedJobId ||
      !jobsQuery.data.jobs.some((job) => job.jobId === selectedJobId)
    ) {
      setSelectedJobId(jobsQuery.data.jobs[0]?.jobId)
    }
  }, [jobDialogOpen, jobsQuery.data?.jobs, selectedJobId])

  React.useEffect(() => {
    if (!workersQuery.data?.workers.length) {
      if (typeof selectedWorkerId !== 'undefined') {
        setSelectedWorkerId(undefined)
      }
      if (workerDialogOpen) {
        setWorkerDialogOpen(false)
      }
      return
    }

    if (
      selectedWorkerId &&
      !workersQuery.data.workers.some(
        (worker) => worker.workerId === selectedWorkerId,
      )
    ) {
      setSelectedWorkerId(undefined)
      setWorkerDialogOpen(false)
    }
  }, [workerDialogOpen, workersQuery.data?.workers, selectedWorkerId])

  const startMutation = $api.useMutation(
    'post',
    '/api/v1/server/docker-hosts/{hostId}/containers/{containerId}/start',
  )
  const stopMutation = $api.useMutation(
    'post',
    '/api/v1/server/docker-hosts/{hostId}/containers/{containerId}/stop',
  )
  const restartMutation = $api.useMutation(
    'post',
    '/api/v1/server/docker-hosts/{hostId}/containers/{containerId}/restart',
  )
  const removeMutation = $api.useMutation(
    'post',
    '/api/v1/server/docker-hosts/{hostId}/containers/{containerId}/remove',
  )

  const handleAction = async (
    action: 'start' | 'stop' | 'restart' | 'remove',
  ) => {
    const mutationMap = {
      start: startMutation,
      stop: stopMutation,
      restart: restartMutation,
      remove: removeMutation,
    } as const

    const mutation = mutationMap[action]
    await mutation.mutateAsync({
      params: {
        path: { hostId, containerId },
      },
    })

    await stateQuery.refetch()
    if (action === 'remove') {
      void navigate(`/server/docker/${hostId}`)
      return
    }
    void logsQuery.refetch()
    void statsQuery.refetch()
    void inspectQuery.refetch()
  }

  const isLoading = stateQuery.isLoading
  const hostState: DockerHostState | undefined = container.host
  const containerState: DockerHostContainerState | undefined =
    container.container
  const isRunning = containerState?.state === 'running'
  const logEntries = logsQuery.data?.entries ?? []
  const containerStats: DockerContainerStats | undefined =
    statsQuery.data?.stats
  const gpuInfo: DockerContainerGpuInfo | undefined = inspectQuery.data?.gpuInfo
  const jobEntries = jobDetailQuery.data?.entries ?? []
  const workerJobs = workerDetailQuery.data?.jobs ?? []
  const selectedWorker = React.useMemo(
    () =>
      workersQuery.data?.workers.find(
        (worker) => worker.workerId === selectedWorkerId,
      ),
    [selectedWorkerId, workersQuery.data?.workers],
  )
  const inspectText = React.useMemo(() => {
    if (inspectQuery.isLoading) {
      return 'Loading inspect data...'
    }
    if (!inspectQuery.data?.inspect) {
      return 'No inspect data available.'
    }
    return JSON.stringify(inspectQuery.data.inspect, null, 2)
  }, [inspectQuery.data?.inspect, inspectQuery.isLoading])

  const jobStateText = React.useMemo(() => {
    if (!jobDetailQuery.data?.state) {
      return 'No job state available.'
    }
    return JSON.stringify(jobDetailQuery.data.state, null, 2)
  }, [jobDetailQuery.data?.state])

  const workerStateText = React.useMemo(() => {
    if (!workerDetailQuery.data?.workerState) {
      return 'No worker state available.'
    }
    return JSON.stringify(workerDetailQuery.data.workerState, null, 2)
  }, [workerDetailQuery.data?.workerState])

  if (stateQuery.isError) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-destructive">
        Failed to load docker host state.
      </div>
    )
  }

  if (!containerState && !isLoading) {
    return (
      <EmptyState text="Container not found" icon={RefreshCcw} variant="row" />
    )
  }

  if (!containerState) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading container...
      </div>
    )
  }

  return (
    <div className="flex size-full flex-1 flex-col gap-6 overflow-y-auto">
      <div className="rounded-xl border border-muted/40 bg-muted/10 p-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {containerState.id.slice(0, 12)}
            </h1>
            {renderStateBadge(containerState.state)}
          </div>
          <p className="text-sm text-muted-foreground">
            {containerState.image}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-muted/40 bg-background/60 px-2 py-1">
              Host: {hostState?.id ?? hostId}
            </span>
            <span className="rounded-full border border-muted/40 bg-background/60 px-2 py-1">
              Profile: {containerState.profileId ?? 'Unknown'}
            </span>
            <span className="rounded-full border border-muted/40 bg-background/60 px-2 py-1">
              Created:{' '}
              {containerState.createdAt ? (
                <DateDisplay
                  date={containerState.createdAt}
                  showTimeSince={true}
                />
              ) : (
                'Unknown'
              )}
            </span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Container Details</CardTitle>
            <p className="text-sm text-muted-foreground">
              Identifiers and lifecycle metadata.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <AlertDialog
              open={startDialogOpen}
              onOpenChange={setStartDialogOpen}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isRunning || startMutation.isPending}
                >
                  <Play className="mr-2 size-4" />
                  Start
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Start container?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Starting will boot the container on host{' '}
                    {hostState?.id ?? hostId}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className={buttonVariants({ variant: 'secondary' })}
                    onClick={() => {
                      setStartDialogOpen(false)
                      void handleAction('start')
                    }}
                  >
                    Start
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isRunning || stopMutation.isPending}
                >
                  <Square className="mr-2 size-4" />
                  Stop
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Stop container?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Stopping will halt the running container on host{' '}
                    {hostState?.id ?? hostId}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className={buttonVariants({ variant: 'outline' })}
                    onClick={() => {
                      setStopDialogOpen(false)
                      void handleAction('stop')
                    }}
                  >
                    Stop
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog
              open={restartDialogOpen}
              onOpenChange={setRestartDialogOpen}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isRunning || restartMutation.isPending}
                >
                  <RotateCw className="mr-2 size-4" />
                  Restart
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restart container?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Restarting will stop and start the container immediately.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className={buttonVariants({ variant: 'outline' })}
                    onClick={() => {
                      setRestartDialogOpen(false)
                      void handleAction('restart')
                    }}
                  >
                    Restart
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog
              open={purgeDialogOpen}
              onOpenChange={setPurgeDialogOpen}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={purgeJobsMutation.isPending}
                >
                  <Trash2 className="mr-2 size-4" />
                  Purge jobs
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm purge?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Remove logs, state, and outputs for jobs completed before
                    the selected duration.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="mt-4">
                  <label
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    htmlFor="purge-duration-select"
                  >
                    Older than
                  </label>
                  <select
                    id="purge-duration-select"
                    value={purgeDuration}
                    onChange={(event) => setPurgeDuration(event.target.value)}
                    className="mt-1 w-full rounded-md border border-muted/60 bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {PURGE_DURATION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className={buttonVariants({ variant: 'destructive' })}
                    onClick={() => {
                      setPurgeDialogOpen(false)
                      void handlePurgeJobs()
                    }}
                  >
                    Purge
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={removeMutation.isPending}
                >
                  <Trash2 className="mr-2 size-4" />
                  Remove
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove container?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will force remove the container from the host.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className={buttonVariants({ variant: 'destructive' })}
                    onClick={() => void handleAction('remove')}
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <div className="space-y-0 px-6 pb-6">
          {(purgeJobsMutation.isPending ||
            purgeJobsMutation.isError ||
            purgeMessage) && (
            <div className="space-y-1 pb-4 text-sm">
              {purgeJobsMutation.isPending ? (
                <div className="text-muted-foreground">Purging...</div>
              ) : null}
              {purgeJobsMutation.isError ? (
                <div className="text-destructive">{purgeJobsErrorMessage}</div>
              ) : null}
              {purgeMessage ? (
                <div className="text-emerald-500">{purgeMessage}</div>
              ) : null}
            </div>
          )}
          <div className="space-y-0">
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>Container ID</div>
              <div className={cn(VALUE_CLASS, 'col-span-2 font-mono text-xs')}>
                {containerState.id}
              </div>
            </div>
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>Host</div>
              <div className={VALUE_CLASS}>{hostState?.id ?? hostId}</div>
            </div>
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>Profile ID</div>
              <div className={VALUE_CLASS}>
                {containerState.profileId ?? (
                  <span className="italic opacity-50">Unknown</span>
                )}
              </div>
            </div>
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>Profile Hash</div>
              <div className={VALUE_CLASS}>
                {containerState.profileHash ?? (
                  <span className="italic opacity-50">Unknown</span>
                )}
              </div>
            </div>
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>Created</div>
              <div className={VALUE_CLASS}>
                {containerState.createdAt ? (
                  <DateDisplay
                    date={containerState.createdAt}
                    showTimeSince={true}
                  />
                ) : (
                  <span className="italic opacity-50">Unknown</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resource Usage</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          {statsQuery.isError ? (
            <div className="pb-3 text-sm text-destructive">
              Failed to load container stats.
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md border border-muted/30 bg-muted/10 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                CPU Usage
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {containerStats?.cpuPercent !== undefined ? (
                  `${containerStats.cpuPercent.toFixed(1)}%`
                ) : (
                  <span className="italic opacity-50">Unknown</span>
                )}
              </div>
            </div>
            <div className="rounded-md border border-muted/30 bg-muted/10 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Memory Used
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {containerStats?.memoryBytes !== undefined ? (
                  formatBytes(containerStats.memoryBytes)
                ) : (
                  <span className="italic opacity-50">Unknown</span>
                )}
              </div>
            </div>
            <div className="rounded-md border border-muted/30 bg-muted/10 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Memory Limit
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {containerStats?.memoryLimitBytes !== undefined ? (
                  formatBytes(containerStats.memoryLimitBytes)
                ) : (
                  <span className="italic opacity-50">Unknown</span>
                )}
              </div>
            </div>
            <div className="rounded-md border border-muted/30 bg-muted/10 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Memory Usage
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {containerStats?.memoryPercent !== undefined ? (
                  `${containerStats.memoryPercent.toFixed(1)}%`
                ) : (
                  <span className="italic opacity-50">Unknown</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {gpuInfo ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">GPU Info</CardTitle>
          </CardHeader>
          <div className="space-y-0 px-6 pb-6">
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>Driver</div>
              <div className={VALUE_CLASS}>
                {gpuInfo.driver ?? (
                  <span className="italic opacity-50">Unknown</span>
                )}
              </div>
            </div>
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>Command</div>
              <div className={cn(VALUE_CLASS, 'col-span-2 font-mono text-xs')}>
                {gpuInfo.command ?? (
                  <span className="italic opacity-50">None</span>
                )}
              </div>
            </div>
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>Output</div>
              <div className={cn(VALUE_CLASS, 'col-span-2')}>
                {gpuInfo.output ? (
                  <pre className="max-h-[200px] overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                    {gpuInfo.output}
                  </pre>
                ) : (
                  <span className="italic opacity-50">None</span>
                )}
              </div>
            </div>
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>Error</div>
              <div
                className={cn(
                  VALUE_CLASS,
                  'col-span-2',
                  gpuInfo.error ? 'text-destructive' : undefined,
                )}
              >
                {gpuInfo.error ? (
                  gpuInfo.error
                ) : (
                  <span className="italic opacity-50">None</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">HTTP Workers</CardTitle>
              <Badge variant={BadgeVariant.outline} className="text-xs">
                {workersQuery.data?.workers.length ?? 0}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Persistent HTTP workers discovered in the container.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void workersQuery.refetch()}
          >
            <RefreshCcw className="mr-2 size-4" />
            Refresh
          </Button>
        </CardHeader>
        <div className="flex flex-col gap-2 px-6 pb-6">
          {workersQuery.isError ? (
            <div className="text-sm text-destructive">
              Failed to load workers.
            </div>
          ) : workersQuery.data?.workers.length ? (
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
              {workersQuery.data.workers.map((worker) => (
                <Button
                  key={worker.workerId}
                  variant={
                    selectedWorkerId === worker.workerId
                      ? 'secondary'
                      : 'outline'
                  }
                  size="sm"
                  className="w-full justify-between gap-3 font-mono text-xs"
                  onClick={() => handleOpenWorker(worker.workerId)}
                >
                  <span className="break-all">{worker.workerId}</span>
                  <span className="text-muted-foreground">:{worker.port}</span>
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {workersQuery.isLoading
                ? 'Loading workers...'
                : 'No HTTP workers found.'}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Recent Jobs</CardTitle>
              <Badge variant={BadgeVariant.outline} className="text-xs">
                {jobsQuery.data?.jobs.length ?? 0}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Latest job state files discovered in the container.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void jobsQuery.refetch()}
          >
            <RefreshCcw className="mr-2 size-4" />
            Refresh
          </Button>
        </CardHeader>
        <div className="flex flex-col gap-2 px-6 pb-6">
          {jobsQuery.isError ? (
            <div className="text-sm text-destructive">
              Failed to load recent jobs.
            </div>
          ) : jobsQuery.data?.jobs.length ? (
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
              {jobsQuery.data.jobs.map((job) => (
                <Button
                  key={job.jobId}
                  variant={
                    selectedJobId === job.jobId ? 'secondary' : 'outline'
                  }
                  size="sm"
                  className="w-full justify-start gap-3 font-mono text-xs"
                  onClick={() => handleOpenJob(job.jobId)}
                >
                  <span className="break-all">{job.jobId}</span>
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {jobsQuery.isLoading
                ? 'Loading jobs...'
                : 'No job state files found.'}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Logs</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-4 px-6 pb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tail</span>
              <Select
                value={tail.toString()}
                onValueChange={(value) => setTail(Number(value))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOG_TAIL_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option.toString()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void logsQuery.refetch()}
            >
              <RefreshCcw className="mr-2 size-4" />
              Refresh
            </Button>
          </div>
          <div className="rounded-md border border-muted/30 bg-muted/10 p-4">
            <pre className="max-h-[420px] overflow-x-hidden whitespace-pre-wrap text-xs leading-relaxed">
              {logsQuery.isLoading
                ? 'Loading logs...'
                : logEntries.length
                  ? logEntries.map((entry, index) => (
                      <span
                        key={`${entry.stream}-${index}`}
                        className={
                          entry.stream === 'stderr'
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                        }
                      >
                        {entry.text}
                      </span>
                    ))
                  : 'No logs available.'}
            </pre>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Docker Inspect</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          {inspectQuery.isError ? (
            <div className="text-sm text-destructive">
              Failed to load container inspect data.
            </div>
          ) : (
            <div className="rounded-md border border-muted/30 bg-muted/10 p-4">
              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                {inspectText}
              </pre>
            </div>
          )}
        </div>
      </Card>

      <Dialog open={workerDialogOpen} onOpenChange={setWorkerDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Worker Details</DialogTitle>
            <DialogDescription>
              {selectedWorker ? (
                <span className="font-mono text-xs text-muted-foreground">
                  {selectedWorker.workerId} :{selectedWorker.port}
                </span>
              ) : (
                'Worker state and recent jobs for the selected worker.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
            {!selectedWorkerId ? (
              <div className="text-sm text-muted-foreground">
                Select a worker to view details.
              </div>
            ) : workerDetailQuery.isError ? (
              <div className="text-sm text-destructive">
                Failed to load worker details.
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  <div className="text-sm font-semibold text-muted-foreground">
                    Worker State
                  </div>
                  {workerDetailQuery.data?.workerStateError ? (
                    <div className="mt-2 text-sm text-destructive">
                      {workerDetailQuery.data.workerStateError}
                    </div>
                  ) : workerDetailQuery.isLoading ? (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Loading worker state...
                    </div>
                  ) : (
                    <div className="mt-2 rounded-md border border-muted/30 bg-muted/10 p-4">
                      <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                        {workerStateText}
                      </pre>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-muted-foreground">
                      Recent Jobs
                    </div>
                    <Badge variant={BadgeVariant.outline} className="text-xs">
                      {workerJobs.length}
                    </Badge>
                  </div>
                  {workerDetailQuery.data?.jobsError ? (
                    <div className="text-sm text-destructive">
                      {workerDetailQuery.data.jobsError}
                    </div>
                  ) : null}
                  {workerJobs.length ? (
                    <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
                      {workerJobs.map((job) => (
                        <div
                          key={job.jobId}
                          className="rounded-md border border-muted/30 bg-muted/10 px-3 py-2 font-mono text-xs"
                        >
                          <span className="break-all">{job.jobId}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {workerDetailQuery.isLoading
                        ? 'Loading jobs...'
                        : 'No jobs found for this worker.'}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={jobDialogOpen} onOpenChange={setJobDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
            <DialogDescription>
              {selectedJobId ? (
                <span className="font-mono text-xs text-muted-foreground">
                  {selectedJobId}
                </span>
              ) : (
                'Job state and logs for the selected job.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
            {!selectedJobId ? (
              <div className="text-sm text-muted-foreground">
                Select a job to view details.
              </div>
            ) : jobDetailQuery.isError ? (
              <div className="text-sm text-destructive">
                Failed to load job details.
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  <div className="text-sm font-semibold text-muted-foreground">
                    Job State
                  </div>
                  {jobDetailQuery.data?.stateError ? (
                    <div className="mt-2 text-sm text-destructive">
                      {jobDetailQuery.data.stateError}
                    </div>
                  ) : jobDetailQuery.isLoading ? (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Loading job state...
                    </div>
                  ) : (
                    <div className="mt-2 rounded-md border border-muted/30 bg-muted/10 p-4">
                      <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                        {jobStateText}
                      </pre>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  <div className="text-sm font-semibold text-muted-foreground">
                    Job Log
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Tail
                      </span>
                      <Input
                        type="number"
                        min={1}
                        value={jobTail}
                        onChange={(event) =>
                          setJobTail(() => {
                            const nextValue = Number(event.target.value)
                            if (!Number.isFinite(nextValue)) {
                              return jobTail
                            }
                            return Math.max(1, nextValue)
                          })
                        }
                        className="w-24"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void jobDetailQuery.refetch()}
                    >
                      <RefreshCcw className="mr-2 size-4" />
                      Refresh
                    </Button>
                  </div>
                  {jobDetailQuery.data?.logError ? (
                    <div className="text-sm text-destructive">
                      {jobDetailQuery.data.logError}
                    </div>
                  ) : null}
                  <div className="rounded-md border border-muted/30 bg-muted/10 p-4">
                    <pre className="max-h-[320px] overflow-x-hidden whitespace-pre-wrap text-xs leading-relaxed">
                      {jobDetailQuery.isLoading
                        ? 'Loading job log...'
                        : jobEntries.length
                          ? jobEntries.map((entry, index) => (
                              <span
                                key={`${entry.stream}-${index}`}
                                className={
                                  entry.stream === 'stderr'
                                    ? 'text-destructive'
                                    : 'text-muted-foreground'
                                }
                              >
                                {entry.text}
                              </span>
                            ))
                          : 'No job log available.'}
                    </pre>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
