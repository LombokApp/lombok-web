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
import { Checkbox } from '@lombokapp/ui-toolkit/components/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@lombokapp/ui-toolkit/components/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@lombokapp/ui-toolkit/components/dialog'
import { Input } from '@lombokapp/ui-toolkit/components/input/input'
import { cn } from '@lombokapp/ui-toolkit/utils'
import {
  dateToHumanReadable,
  formatBytes,
  timeSinceOrUntil,
} from '@lombokapp/utils'
import {
  Activity,
  BrushCleaning,
  ChevronRight,
  ExternalLink,
  Play,
  RefreshCcw,
  RotateCw,
  Search,
  Square,
  TerminalSquare,
  Trash2,
} from 'lucide-react'
import React from 'react'
import { Link, useNavigate } from 'react-router'

import { CodeValue } from '@/src/components/code-value/code-value'
import { EmptyState } from '@/src/components/empty-state/empty-state'
import { InlineSelect } from '@/src/components/inline-select/inline-select'
import { $api } from '@/src/services/api'

import { ContainerConsole } from './container-console'
import { DockerInspectSection } from './docker-inspect-view'
import type {
  DockerContainerGpuInfo,
  DockerContainerStats,
  DockerHostContainerState,
} from './server-docker.types'

const LABEL_CLASS =
  'text-xs font-semibold uppercase tracking-wide text-muted-foreground'
const VALUE_CLASS = 'text-sm'

const PURGE_DURATION_OPTIONS = ['1h', '6h', '12h', '24h'] as const
const LOG_TAIL_OPTIONS = [100, 200, 500, 1000, 2000].map((n) => ({
  value: n,
  label: `${n} lines`,
}))

// ─── Subcomponents ─────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string
  value?: React.ReactNode
  mono?: boolean
}) {
  const ROW =
    'grid grid-cols-1 gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-3'
  const isEmpty = value === undefined || value === null
  return (
    <div className={ROW}>
      <div className={LABEL_CLASS}>{label}</div>
      <div className="col-span-2 text-sm">
        {isEmpty ? (
          <span className="italic opacity-50">None</span>
        ) : mono ? (
          <CodeValue>{value}</CodeValue>
        ) : (
          value
        )}
      </div>
    </div>
  )
}

const StateBadge = (state: DockerHostContainerState['state']) => {
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

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
}) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <div className={LABEL_CLASS}>{label}</div>
      <div className="text-xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </Card>
  )
}

function StandaloneContainerActions({
  isRunning,
  isPending,
  startDialogOpen,
  setStartDialogOpen,
  stopDialogOpen,
  setStopDialogOpen,
  removeDialogOpen,
  setRemoveDialogOpen,
  alsoRemoveContainer,
  setAlsoRemoveContainer,
  onStart,
  onStop,
  onRestart,
  onRemove,
  restartDialogOpen,
  setRestartDialogOpen,
}: {
  isRunning: boolean
  isPending: boolean
  startDialogOpen: boolean
  setStartDialogOpen: (open: boolean) => void
  stopDialogOpen: boolean
  setStopDialogOpen: (open: boolean) => void
  restartDialogOpen: boolean
  setRestartDialogOpen: (open: boolean) => void
  removeDialogOpen: boolean
  setRemoveDialogOpen: (open: boolean) => void
  alsoRemoveContainer: boolean
  setAlsoRemoveContainer: (checked: boolean) => void
  onStart: () => void
  onStop: () => void
  onRestart: () => void
  onRemove: () => void
}) {
  return (
    <>
      <AlertDialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            disabled={isRunning || isPending}
          >
            <Play className="mr-2 size-4" />
            Start
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start container?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set the desired status to &quot;running&quot;, which
              will start the container.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'secondary' })}
              onClick={onStart}
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
            disabled={!isRunning || isPending}
          >
            <Square className="mr-2 size-4" />
            Stop
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop container?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set the desired status to &quot;stopped&quot;, which
              will stop the container.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'outline' })}
              onClick={onStop}
            >
              Stop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restartDialogOpen} onOpenChange={setRestartDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={!isRunning || isPending}
          >
            <RotateCw className="mr-2 size-4" />
            Restart
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart container?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restart the docker container immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'outline' })}
              onClick={onRestart}
            >
              Restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={removeDialogOpen}
        onOpenChange={(open) => {
          setRemoveDialogOpen(open)
          if (!open) {
            setAlsoRemoveContainer(false)
          }
        }}
      >
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="sm"
            disabled={isPending}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete standalone container?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the standalone container configuration. The
              docker container will remain unless you choose to remove it as
              well.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-3 py-2">
            <Checkbox
              id="also-remove-docker"
              checked={alsoRemoveContainer}
              onCheckedChange={(checked) =>
                setAlsoRemoveContainer(checked === true)
              }
            />
            <label
              htmlFor="also-remove-docker"
              className="text-sm text-muted-foreground"
            >
              Also remove the docker container from the host
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive' })}
              onClick={onRemove}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function WorkerContainerActions({
  isRunning,
  isWorker,
  isPending,
  startDialogOpen,
  setStartDialogOpen,
  stopDialogOpen,
  setStopDialogOpen,
  restartDialogOpen,
  setRestartDialogOpen,
  purgeDialogOpen,
  setPurgeDialogOpen,
  purgeDuration,
  setPurgeDuration,
  purgeJobsMutation,
  hostLabel,
  onAction,
  onPurge,
}: {
  isRunning: boolean
  isWorker: boolean
  isPending: boolean
  startDialogOpen: boolean
  setStartDialogOpen: (open: boolean) => void
  stopDialogOpen: boolean
  setStopDialogOpen: (open: boolean) => void
  restartDialogOpen: boolean
  setRestartDialogOpen: (open: boolean) => void
  purgeDialogOpen: boolean
  setPurgeDialogOpen: (open: boolean) => void
  purgeDuration: string
  setPurgeDuration: (v: string) => void
  purgeJobsMutation: { isPending: boolean }
  hostLabel: string
  onAction: (action: 'start' | 'stop' | 'restart' | 'remove') => void
  onPurge: () => void
}) {
  return (
    <>
      <AlertDialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            disabled={isRunning || isPending}
          >
            <Play className="mr-2 size-4" />
            Start
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start container?</AlertDialogTitle>
            <AlertDialogDescription>
              Starting will boot the container on host {hostLabel}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'secondary' })}
              onClick={() => onAction('start')}
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
            disabled={!isRunning || isPending}
          >
            <Square className="mr-2 size-4" />
            Stop
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop container?</AlertDialogTitle>
            <AlertDialogDescription>
              Stopping will halt the running container on host {hostLabel}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'outline' })}
              onClick={() => onAction('stop')}
            >
              Stop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restartDialogOpen} onOpenChange={setRestartDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={!isRunning || isPending}
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
              onClick={() => onAction('restart')}
            >
              Restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isWorker && (
        <AlertDialog open={purgeDialogOpen} onOpenChange={setPurgeDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              disabled={purgeJobsMutation.isPending}
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              <BrushCleaning className="mr-2 size-4" />
              Purge jobs
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm purge?</AlertDialogTitle>
              <AlertDialogDescription>
                Remove logs, state, and outputs for jobs completed before the
                selected duration.
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
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
                onClick={onPurge}
              >
                Purge
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="sm"
            disabled={isPending}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            <Trash2 className="size-4" />
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
              onClick={() => onAction('remove')}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
  const [logFilter, setLogFilter] = React.useState('')
  const [logPaused, setLogPaused] = React.useState(false)
  const [logAutoScroll, setLogAutoScroll] = React.useState(true)
  const [logsOpen, setLogsOpen] = React.useState(true)
  const logRef = React.useRef<HTMLDivElement>(null)
  const [jobTail, setJobTail] = React.useState(200)
  const [selectedJobId, setSelectedJobId] = React.useState<string>()
  const [jobDialogOpen, setJobDialogOpen] = React.useState(false)
  const [startDialogOpen, setStartDialogOpen] = React.useState(false)
  const [stopDialogOpen, setStopDialogOpen] = React.useState(false)
  const [restartDialogOpen, setRestartDialogOpen] = React.useState(false)
  const [purgeDialogOpen, setPurgeDialogOpen] = React.useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = React.useState(false)
  const [alsoRemoveContainer, setAlsoRemoveContainer] = React.useState(false)
  const [selectedWorkerId, setSelectedWorkerId] = React.useState<string>()
  const [workerDialogOpen, setWorkerDialogOpen] = React.useState(false)
  const [purgeDuration, setPurgeDuration] = React.useState('6h')
  const [purgeMessage, setPurgeMessage] = React.useState<string>()

  const stateQuery = $api.useQuery('get', '/api/v1/server/docker-hosts/state')
  const hostQuery = $api.useQuery('get', '/api/v1/docker/hosts/{id}', {
    params: { path: { id: hostId } },
  })
  const hostLabel = hostQuery.data?.result.label ?? hostId

  const container = React.useMemo(() => {
    const host = stateQuery.data?.hosts.find((entry) => entry.id === hostId)
    const found = host?.containers.find((entry) => entry.id === containerId)
    return {
      host,
      container: found,
      isWorker: found?.containerType === 'worker',
      isStandalone: found?.containerType === 'standalone',
    }
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
    { refetchInterval: logPaused ? false : 5000 },
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
    { enabled: container.isWorker },
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

  const workersQuery = $api.useQuery(
    'get',
    '/api/v1/server/docker-hosts/{hostId}/containers/{containerId}/workers',
    {
      params: {
        path: { hostId, containerId },
      },
    },
    { enabled: container.isWorker },
  )

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

  // --- Worker container mutations (docker-level operations) ---
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

  // --- Standalone container mutations (management-level operations) ---
  const standaloneDesiredStatusUpdateMutation = $api.useMutation(
    'post',
    '/api/v1/docker/standalone-containers/{id}/desired-status',
  )
  const standaloneDeleteMutation = $api.useMutation(
    'delete',
    '/api/v1/docker/standalone-containers/{id}',
  )

  const handleWorkerAction = async (
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
  const containerState: DockerHostContainerState | undefined =
    container.container

  const handleStandaloneDesiredStatus = async (
    desiredStatus: 'running' | 'stopped',
  ) => {
    if (containerState?.containerType !== 'standalone') {
      return
    }
    const standaloneId = containerState.standaloneContainerId

    await standaloneDesiredStatusUpdateMutation.mutateAsync({
      params: { path: { id: standaloneId } },
      body: { desiredStatus },
    })

    await stateQuery.refetch()
    void logsQuery.refetch()
    void statsQuery.refetch()
    void inspectQuery.refetch()
  }

  const handleStandaloneRemove = async (alsoRemoveDocker: boolean) => {
    if (containerState?.containerType !== 'standalone') {
      return
    }
    const standaloneId = containerState.standaloneContainerId

    if (alsoRemoveDocker) {
      await removeMutation.mutateAsync({
        params: { path: { hostId, containerId } },
      })
    }

    await standaloneDeleteMutation.mutateAsync({
      params: { path: { id: standaloneId } },
    })

    void navigate(`/server/docker/${hostId}`)
  }

  const isRunning = containerState?.state === 'running'
  const isWorker = containerState?.containerType === 'worker'
  const isStandalone = containerState?.containerType === 'standalone'
  const logEntries = React.useMemo(
    () => logsQuery.data?.entries ?? [],
    [logsQuery.data?.entries],
  )
  const filteredLogEntries = React.useMemo(() => {
    if (!logFilter) {
      return logEntries
    }
    const lower = logFilter.toLowerCase()
    return logEntries.filter((e) => e.text.toLowerCase().includes(lower))
  }, [logEntries, logFilter])

  // Auto-scroll logs
  React.useEffect(() => {
    if (logAutoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [filteredLogEntries, logAutoScroll])

  const handleLogScroll = React.useCallback(() => {
    if (!logRef.current) {
      return
    }
    const { scrollTop, scrollHeight, clientHeight } = logRef.current
    setLogAutoScroll(scrollHeight - scrollTop - clientHeight < 40)
  }, [])
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

  const anyActionPending =
    startMutation.isPending ||
    stopMutation.isPending ||
    restartMutation.isPending ||
    removeMutation.isPending ||
    standaloneDesiredStatusUpdateMutation.isPending ||
    standaloneDeleteMutation.isPending

  return (
    <div className="flex size-full flex-1 flex-col gap-6 overflow-y-auto">
      {/* ── Header card: identity + actions + metadata ── */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {containerState.id.slice(0, 12)}
              </h1>
              {StateBadge(containerState.state)}
              <Badge
                variant={
                  isWorker ? BadgeVariant.secondary : BadgeVariant.outline
                }
              >
                {isWorker ? 'Worker' : 'Standalone'}
              </Badge>
            </div>
            <p className="font-mono text-sm text-muted-foreground">
              {containerState.image}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {hostLabel}
              <span className="mx-1.5 text-muted-foreground/40">/</span>
              {containerState.id}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isStandalone ? (
              <StandaloneContainerActions
                isRunning={isRunning}
                isPending={anyActionPending}
                startDialogOpen={startDialogOpen}
                setStartDialogOpen={setStartDialogOpen}
                stopDialogOpen={stopDialogOpen}
                setStopDialogOpen={setStopDialogOpen}
                restartDialogOpen={restartDialogOpen}
                setRestartDialogOpen={setRestartDialogOpen}
                removeDialogOpen={removeDialogOpen}
                setRemoveDialogOpen={setRemoveDialogOpen}
                alsoRemoveContainer={alsoRemoveContainer}
                setAlsoRemoveContainer={setAlsoRemoveContainer}
                onStart={() => {
                  setStartDialogOpen(false)
                  void handleStandaloneDesiredStatus('running')
                }}
                onStop={() => {
                  setStopDialogOpen(false)
                  void handleStandaloneDesiredStatus('stopped')
                }}
                onRestart={() => {
                  setRestartDialogOpen(false)
                  void handleWorkerAction('restart')
                }}
                onRemove={() => {
                  setRemoveDialogOpen(false)
                  void handleStandaloneRemove(alsoRemoveContainer)
                }}
              />
            ) : (
              <WorkerContainerActions
                isRunning={isRunning}
                isWorker={isWorker}
                isPending={anyActionPending}
                startDialogOpen={startDialogOpen}
                setStartDialogOpen={setStartDialogOpen}
                stopDialogOpen={stopDialogOpen}
                setStopDialogOpen={setStopDialogOpen}
                restartDialogOpen={restartDialogOpen}
                setRestartDialogOpen={setRestartDialogOpen}
                purgeDialogOpen={purgeDialogOpen}
                setPurgeDialogOpen={setPurgeDialogOpen}
                purgeDuration={purgeDuration}
                setPurgeDuration={setPurgeDuration}
                purgeJobsMutation={purgeJobsMutation}
                hostLabel={hostLabel}
                onAction={(action) => {
                  if (action === 'start') {
                    setStartDialogOpen(false)
                  }
                  if (action === 'stop') {
                    setStopDialogOpen(false)
                  }
                  if (action === 'restart') {
                    setRestartDialogOpen(false)
                  }
                  void handleWorkerAction(action)
                }}
                onPurge={() => {
                  setPurgeDialogOpen(false)
                  void handlePurgeJobs()
                }}
              />
            )}
          </div>
        </div>

        {/* Purge feedback (worker only) */}
        {isWorker &&
          (purgeJobsMutation.isPending ||
            purgeJobsMutation.isError ||
            purgeMessage) && (
            <div className="mt-4 space-y-1 text-sm">
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

        {/* Worker metadata */}
        {containerState.containerType === 'worker' && (
          <>
            <div className="my-4 border-t border-border" />
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              {containerState.labels['lombok.container_app_id'] && (
                <div>
                  <div className={LABEL_CLASS}>App</div>
                  <div className={cn(VALUE_CLASS, 'mt-1 w-min')}>
                    <Link
                      to={`/server/apps/${containerState.labels['lombok.container_app_id']}`}
                      className="text-muted-foreground"
                    >
                      <CodeValue className="hover:bg-foreground/10">
                        <span className="flex items-center gap-1">
                          {containerState.labels['lombok.container_app_id']}
                          <ExternalLink className="size-3" />
                        </span>
                      </CodeValue>
                    </Link>
                  </div>
                </div>
              )}
              <div>
                <div className={LABEL_CLASS}>Profile</div>
                <div className={cn(VALUE_CLASS, 'mt-1')}>
                  <CodeValue>
                    {containerState.profileId.split(':').pop()}
                  </CodeValue>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="CPU"
          value={
            containerStats?.cpuPercent !== undefined ? (
              `${containerStats.cpuPercent.toFixed(1)}%`
            ) : (
              <span className="italic opacity-50">--</span>
            )
          }
        />
        <StatCard
          label="Memory"
          value={
            containerStats?.memoryBytes !== undefined ? (
              <>
                {formatBytes(containerStats.memoryBytes)}
                {containerStats.memoryPercent !== undefined && (
                  <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                    ({containerStats.memoryPercent.toFixed(1)}%)
                  </span>
                )}
              </>
            ) : (
              <span className="italic opacity-50">--</span>
            )
          }
          sub={
            containerStats?.memoryLimitBytes !== undefined
              ? `of ${formatBytes(containerStats.memoryLimitBytes)} limit`
              : undefined
          }
        />
        <StatCard
          label="Created"
          value={
            containerState.createdAt ? (
              dateToHumanReadable(new Date(containerState.createdAt))
            ) : (
              <span className="italic opacity-50">Unknown</span>
            )
          }
          sub={
            containerState.createdAt
              ? timeSinceOrUntil(new Date(containerState.createdAt))
              : undefined
          }
        />
      </div>

      {gpuInfo ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">GPU Info</CardTitle>
          </CardHeader>
          <div className="space-y-0 px-6 pb-6">
            <DetailRow label="Driver" value={gpuInfo.driver} />
            <DetailRow label="Command" value={gpuInfo.command} mono />
            <DetailRow
              label="Output"
              value={
                gpuInfo.output ? (
                  <pre className="max-h-[200px] overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                    {gpuInfo.output}
                  </pre>
                ) : undefined
              }
            />
            <DetailRow
              label="Error"
              value={
                gpuInfo.error ? (
                  <span className="text-destructive">{gpuInfo.error}</span>
                ) : undefined
              }
            />
          </div>
        </Card>
      ) : null}

      {isWorker && (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">Workers &amp; Jobs</CardTitle>
              <p className="text-sm text-muted-foreground">
                HTTP workers and recent job state files in the container.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void workersQuery.refetch()
                void jobsQuery.refetch()
              }}
            >
              <RefreshCcw className="mr-2 size-4" />
              Refresh
            </Button>
          </CardHeader>
          <div className="grid gap-6 px-6 pb-6 lg:grid-cols-2">
            {/* HTTP Workers */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground">
                  HTTP Workers
                </span>
                <Badge variant={BadgeVariant.outline} className="text-xs">
                  {workersQuery.data?.workers.length ?? 0}
                </Badge>
              </div>
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
                      <span className="text-muted-foreground">
                        :{worker.port}
                      </span>
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

            {/* Recent Jobs */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground">
                  Recent Jobs
                </span>
                <Badge variant={BadgeVariant.outline} className="text-xs">
                  {jobsQuery.data?.jobs.length ?? 0}
                </Badge>
              </div>
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
          </div>
        </Card>
      )}

      <Collapsible open={logsOpen} onOpenChange={setLogsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer select-none">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ChevronRight
                  className={cn(
                    'size-4 text-muted-foreground transition-transform',
                    logsOpen && 'rotate-90',
                  )}
                />
                <Activity className="size-3.5 text-muted-foreground" />
                Container Logs
                {logsQuery.isLoading && logEntries.length === 0 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    Loading...
                  </span>
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col gap-2 px-6 pb-6">
              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <InlineSelect
                  value={tail}
                  options={LOG_TAIL_OPTIONS}
                  onChange={setTail}
                />

                <div className="flex items-center gap-1 rounded border border-border bg-background px-2 py-1">
                  <Search className="size-3 text-muted-foreground" />
                  <input
                    type="text"
                    className="w-32 border-none bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                    placeholder="Filter..."
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className={cn(
                    'cursor-pointer rounded border px-2 py-1 text-xs',
                    logPaused
                      ? 'border-amber-500/40 bg-amber-500/20 text-amber-500'
                      : 'border-border bg-background text-muted-foreground',
                  )}
                  onClick={() => setLogPaused(!logPaused)}
                >
                  {logPaused ? 'Resume' : 'Pause'}
                </button>

                <button
                  type="button"
                  className="cursor-pointer border-none bg-transparent p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => void logsQuery.refetch()}
                  title="Fetch latest logs"
                >
                  <RefreshCcw className="size-3" />
                </button>

                <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                  {filteredLogEntries.length} lines
                  {logPaused && (
                    <span className="text-amber-500">(paused)</span>
                  )}
                  {logsQuery.dataUpdatedAt > 0 && (
                    <span className="text-[0.6rem] opacity-50">
                      {new Date(logsQuery.dataUpdatedAt).toLocaleTimeString()}
                    </span>
                  )}
                </span>
              </div>

              {/* Log output */}
              {logsQuery.isError ? (
                <div className="text-sm text-destructive">
                  Failed to load logs.
                </div>
              ) : (
                <div
                  ref={logRef}
                  className="overflow-y-auto rounded border border-border bg-background p-2 font-mono text-[0.7rem] leading-relaxed"
                  style={{ height: '320px' }}
                  onScroll={handleLogScroll}
                >
                  {filteredLogEntries.length === 0 ? (
                    <span className="text-muted-foreground">
                      {logsQuery.isLoading ? 'Loading...' : 'No log entries'}
                    </span>
                  ) : (
                    filteredLogEntries.map((entry, index) => (
                      <div
                        key={`${entry.stream}-${index}`}
                        className="flex gap-2 hover:bg-muted/30"
                      >
                        <span
                          className={cn(
                            'w-8 shrink-0 text-right text-[0.65rem]',
                            entry.stream === 'stderr'
                              ? 'text-destructive'
                              : 'text-muted-foreground/60',
                          )}
                        >
                          {entry.stream === 'stderr' ? 'ERR' : 'OUT'}
                        </span>
                        <span className="whitespace-pre-wrap break-all text-foreground">
                          {entry.text}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Scroll indicator */}
              {!logAutoScroll && filteredLogEntries.length > 0 && (
                <button
                  type="button"
                  className="cursor-pointer self-center border-none bg-transparent p-0 text-xs text-blue-500 hover:underline"
                  onClick={() => {
                    setLogAutoScroll(true)
                    if (logRef.current) {
                      logRef.current.scrollTop = logRef.current.scrollHeight
                    }
                  }}
                >
                  Scroll to bottom
                </button>
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TerminalSquare className="size-4 text-muted-foreground" />
            Console
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Interactive shell session in the container.
          </p>
        </CardHeader>
        <div className="px-6 pb-6">
          <ContainerConsole
            hostId={hostId}
            containerId={containerId}
            disabled={!isRunning}
          />
        </div>
      </Card>

      <DockerInspectSection
        data={inspectQuery.data?.inspect}
        isLoading={inspectQuery.isLoading}
        isError={inspectQuery.isError}
      />

      {isWorker && (
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
                      <div className="mt-2 rounded-md border border-border bg-background p-4">
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
                            className="rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
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
      )}

      {isWorker && (
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
                      <div className="mt-2 rounded-md border border-border bg-background p-4">
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
                    <div className="rounded-md border border-border bg-background p-4">
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
      )}
    </div>
  )
}
