import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@lombokapp/ui-toolkit/components/dialog'
import { Input } from '@lombokapp/ui-toolkit/components/input/input'
import { Label } from '@lombokapp/ui-toolkit/components/label/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lombokapp/ui-toolkit/components/select/select'
import React from 'react'

import { $api, $apiClient } from '@/src/services/api'

import {
  buildConfigFromState,
  ContainerConfigForm,
  type ContainerConfigState,
  EMPTY_CONFIG_STATE,
  loadConfigState,
} from './container-config-form'

interface CreateStandaloneContainerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
  /** When set, dialog is in edit mode for an existing container. */
  editContainer?: {
    id: string
    dockerHostId: string
    label: string
    image: string
    tag: string
    desiredStatus: 'running' | 'stopped'
    config: Record<string, unknown>
  }
}

export function CreateStandaloneContainerDialog({
  open,
  onOpenChange,
  onCreated,
  editContainer,
}: CreateStandaloneContainerDialogProps) {
  const isEdit = !!editContainer

  const [dockerHostId, setDockerHostId] = React.useState('')
  const [label, setLabel] = React.useState('')
  const [image, setImage] = React.useState('')
  const [tag, setTag] = React.useState('latest')
  const [desiredStatus, setDesiredStatus] = React.useState<
    'running' | 'stopped'
  >('running')
  const [configState, setConfigState] =
    React.useState<ContainerConfigState>(EMPTY_CONFIG_STATE)
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const formRef = React.useRef<HTMLFormElement>(null)

  const hostsQuery = $api.useQuery('get', '/api/v1/docker/hosts')
  const hosts = hostsQuery.data?.result ?? []

  const resetForm = React.useCallback(() => {
    if (editContainer) {
      setDockerHostId(editContainer.dockerHostId)
      setLabel(editContainer.label)
      setImage(editContainer.image)
      setTag(editContainer.tag)
      setDesiredStatus(editContainer.desiredStatus)
      setConfigState(loadConfigState(editContainer.config))
    } else {
      setDockerHostId('')
      setLabel('')
      setImage('')
      setTag('latest')
      setDesiredStatus('running')
      setConfigState(EMPTY_CONFIG_STATE)
    }
    setError(null)
  }, [editContainer])

  React.useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [open, resetForm])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const config = buildConfigFromState(configState)

      if (isEdit) {
        const { error: apiError } = await $apiClient.PUT(
          '/api/v1/docker/standalone-containers/{id}',
          {
            params: { path: { id: editContainer.id } },
            body: {
              dockerHostId,
              label,
              image,
              tag,
              desiredStatus,
              config,
            },
          },
        )
        if (apiError) {
          setError(
            typeof apiError === 'object' && 'message' in apiError
              ? String(apiError.message)
              : 'Failed to update standalone container',
          )
          return
        }
      } else {
        const { error: apiError } = await $apiClient.POST(
          '/api/v1/docker/standalone-containers',
          {
            body: {
              dockerHostId,
              label,
              image,
              tag,
              desiredStatus,
              config,
            },
          },
        )
        if (apiError) {
          setError(
            typeof apiError === 'object' && 'message' in apiError
              ? String(apiError.message)
              : 'Failed to create standalone container',
          )
          return
        }
      }

      onOpenChange(false)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          resetForm()
        }
        onOpenChange(v)
      }}
    >
      <DialogContent
        aria-description={
          isEdit
            ? 'Edit a standalone Docker container'
            : 'Create a standalone Docker container'
        }
        className="flex max-h-[85vh] flex-col sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? 'Edit Standalone Container'
              : 'Create Standalone Container'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the configuration of this standalone Docker container.'
              : 'Create and optionally start a standalone Docker container on a host.'}
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-1 flex-col gap-4 min-h-0 max-h-max"
        >
          {/* Docker Host */}
          <div className="flex flex-col gap-1.5">
            <Label>Docker Host</Label>
            <Select value={dockerHostId} onValueChange={setDockerHostId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a docker host..." />
              </SelectTrigger>
              <SelectContent>
                {hosts.map((host) => (
                  <SelectItem key={host.id} value={host.id}>
                    <div className="flex items-center gap-2">
                      <span>{host.label}</span>
                      {host.isDefault && (
                        <span className="text-xs text-muted-foreground">
                          (default)
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Label */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sc-label">Label</Label>
            <Input
              id="sc-label"
              placeholder="e.g. My Redis, Nginx Proxy"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
          </div>

          {/* Image + Tag */}
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="sc-image">Image</Label>
              <Input
                id="sc-image"
                placeholder="e.g. nginx, redis"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                required
              />
            </div>
            <div className="flex w-28 flex-col gap-1.5">
              <Label htmlFor="sc-tag">Tag</Label>
              <Input
                id="sc-tag"
                placeholder="latest"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              />
            </div>
          </div>

          {/* Desired Status */}
          <div className="flex flex-col gap-1.5">
            <Label>Desired Status</Label>
            <Select
              value={desiredStatus}
              onValueChange={(v) =>
                setDesiredStatus(v as 'running' | 'stopped')
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="stopped">Stopped</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isEdit
                ? 'Change the desired state of this container.'
                : 'If set to "Running", the container will be created and started immediately.'}
            </p>
          </div>

          {/* Container Config */}
          <ContainerConfigForm state={configState} onChange={setConfigState} />
        </form>

        <div className="flex flex-col gap-2 border-t border-muted/40 pt-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => formRef.current?.requestSubmit()}
              disabled={submitting || !dockerHostId || !label || !image}
            >
              {submitting
                ? isEdit
                  ? 'Saving...'
                  : 'Creating...'
                : isEdit
                  ? 'Save Changes'
                  : 'Create Container'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
