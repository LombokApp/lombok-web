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
import { Switch } from '@lombokapp/ui-toolkit/components/switch/switch'
import React from 'react'

import { $apiClient } from '@/src/services/api'

export function CreateDockerHostDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const [label, setLabel] = React.useState('')
  const [host, setHost] = React.useState('')
  const [type] = React.useState<'docker_endpoint'>('docker_endpoint')
  const [isDefault, setIsDefault] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const resetForm = () => {
    setLabel('')
    setHost('')
    setIsDefault(false)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const { error: apiError } = await $apiClient.POST(
        '/api/v1/docker/hosts',
        {
          body: {
            label,
            host,
            type,
            isDefault,
          },
        },
      )

      if (apiError) {
        setError(
          typeof apiError === 'object' && 'message' in apiError
            ? String(apiError.message)
            : 'Failed to create docker host',
        )
        return
      }

      resetForm()
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
        if (!v) resetForm()
        onOpenChange(v)
      }}
    >
      <DialogContent aria-description="Add a docker host">
        <DialogHeader>
          <DialogTitle>Add Docker Host</DialogTitle>
          <DialogDescription>
            Configure a new docker host endpoint that can run app container
            profiles.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              placeholder="e.g. Local Docker, Homelab Server"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="host">Docker Endpoint</Label>
            <Input
              id="host"
              placeholder="e.g. /var/run/docker.sock or http://10.1.3.20:2375"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="isDefault"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
            <Label htmlFor="isDefault">Set as default host</Label>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !label || !host}
            >
              {submitting ? 'Creating...' : 'Create Host'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
