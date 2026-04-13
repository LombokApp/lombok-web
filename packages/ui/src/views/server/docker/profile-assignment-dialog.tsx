import {
  Badge,
  BadgeVariant,
} from '@lombokapp/ui-toolkit/components/badge/badge'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@lombokapp/ui-toolkit/components/dialog'
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

const UNASSIGNED = '__default__'

interface ProfileAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appIdentifier: string
  appLabel: string
  profileKey: string
  image: string
  /** Existing assignment ID (if one exists) */
  assignmentId: string | null
  /** Currently assigned host ID (if assigned) */
  currentHostId: string | null
  onSaved: () => void
}

export function ProfileAssignmentDialog({
  open,
  onOpenChange,
  appIdentifier,
  appLabel,
  profileKey,
  image,
  assignmentId,
  currentHostId,
  onSaved,
}: ProfileAssignmentDialogProps) {
  const [selectedHostId, setSelectedHostId] = React.useState(
    currentHostId ?? UNASSIGNED,
  )
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // Reset when dialog opens with new data
  React.useEffect(() => {
    if (open) {
      setSelectedHostId(currentHostId ?? UNASSIGNED)
      setError(null)
    }
  }, [open, currentHostId])

  const hostsQuery = $api.useQuery('get', '/api/v1/docker/hosts')
  const hosts = hostsQuery.data?.result ?? []

  const isDirty = selectedHostId !== (currentHostId ?? UNASSIGNED)

  const handleSave = async () => {
    setError(null)
    setSubmitting(true)

    try {
      if (selectedHostId === UNASSIGNED) {
        // Remove assignment if one exists
        if (assignmentId) {
          const { error: apiError } = await $apiClient.DELETE(
            '/api/v1/docker/profile-assignments/{id}',
            { params: { path: { id: assignmentId } } },
          )
          if (apiError) {
            setError('Failed to remove assignment')
            return
          }
        }
      } else if (assignmentId) {
        // Update existing assignment
        const { error: apiError } = await $apiClient.PUT(
          '/api/v1/docker/profile-assignments/{id}',
          {
            params: { path: { id: assignmentId } },
            body: { dockerHostId: selectedHostId },
          },
        )
        if (apiError) {
          setError('Failed to update assignment')
          return
        }
      } else {
        // Create new assignment
        const { error: apiError } = await $apiClient.POST(
          '/api/v1/docker/profile-assignments',
          {
            body: {
              appIdentifier,
              profileKey,
              dockerHostId: selectedHostId,
              config: {},
            },
          },
        )
        if (apiError) {
          setError('Failed to create assignment')
          return
        }
      }

      onOpenChange(false)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-description="Configure profile docker host">
        <DialogHeader>
          <DialogTitle>Configure Docker Host</DialogTitle>
          <DialogDescription>
            Assign a docker host for this app container profile.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Profile info */}
          <div className="flex flex-col gap-2 rounded-lg border border-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">App</span>
              <span className="font-medium">{appLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Profile</span>
              <Badge variant={BadgeVariant.outline} className="text-xs">
                {profileKey}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Image</span>
              <span
                className="max-w-60 truncate text-muted-foreground"
                title={image}
              >
                {image}
              </span>
            </div>
          </div>

          {/* Host selector */}
          <div className="flex flex-col gap-1.5">
            <Label>Docker Host</Label>
            <Select value={selectedHostId} onValueChange={setSelectedHostId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a docker host..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>
                  <span className="italic text-muted-foreground">
                    Use default host
                  </span>
                </SelectItem>
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
            <p className="text-xs text-muted-foreground">
              Select a specific docker host for this profile, or "Use default
              host" to fall back to the system default.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={submitting || !isDirty}
            >
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
