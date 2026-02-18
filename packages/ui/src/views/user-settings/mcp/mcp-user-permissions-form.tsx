import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  CardContent,
  CardHeader,
} from '@lombokapp/ui-toolkit/components/card'
import { Card } from '@lombokapp/ui-toolkit/components/card/card'
import { Skeleton } from '@lombokapp/ui-toolkit/components/skeleton'
import { Switch } from '@lombokapp/ui-toolkit/components/switch/switch'
import { useToast } from '@lombokapp/ui-toolkit/hooks'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

import { $api } from '@/src/services/api'

interface PermissionState {
  canRead: boolean
  canWrite: boolean
  canDelete: boolean
  canMove: boolean
}

const PERMISSION_FIELDS: {
  key: keyof PermissionState
  label: string
  description: string
}[] = [
  {
    key: 'canRead',
    label: 'Allow Read',
    description:
      'List folders, list objects, and download files via MCP.',
  },
  {
    key: 'canWrite',
    label: 'Allow Write',
    description: 'Upload files via MCP.',
  },
  {
    key: 'canDelete',
    label: 'Allow Delete',
    description: 'Delete objects via MCP.',
  },
  {
    key: 'canMove',
    label: 'Allow Move',
    description: 'Move and rename objects via MCP.',
  },
]

export function McpUserPermissionsForm() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const settingsQuery = $api.useQuery('get', '/api/v1/user/mcp/settings')

  const updateMutation = $api.useMutation('put', '/api/v1/user/mcp/settings', {
    onSuccess: () => {
      void queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey
          if (!Array.isArray(queryKey)) {
            return false
          }
          return queryKey.includes('/api/v1/user/mcp/settings')
        },
      })
      toast({
        title: 'Permissions saved',
        description: 'Your default MCP permissions have been updated.',
      })
    },
    onError: () => {
      toast({
        title: 'Failed to save permissions',
        description: 'An error occurred while saving your MCP permissions.',
        variant: 'destructive',
      })
    },
  })

  const [permissions, setPermissions] = React.useState<PermissionState>({
    canRead: true,
    canWrite: true,
    canDelete: true,
    canMove: true,
  })

  const [isDirty, setIsDirty] = React.useState(false)

  React.useEffect(() => {
    if (!settingsQuery.data) {
      return
    }
    const data = settingsQuery.data
    // null means allowed (sparse storage model)
    setPermissions({
      canRead: data.canRead !== false,
      canWrite: data.canWrite !== false,
      canDelete: data.canDelete !== false,
      canMove: data.canMove !== false,
    })
    setIsDirty(false)
  }, [settingsQuery.data])

  const handleToggle = (key: keyof PermissionState, value: boolean) => {
    setPermissions((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      body: {
        canRead: permissions.canRead,
        canWrite: permissions.canWrite,
        canDelete: permissions.canDelete,
        canMove: permissions.canMove,
      },
    })
    setIsDirty(false)
  }

  if (settingsQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (settingsQuery.error) {
    return (
      <div className="text-sm text-destructive">
        Unable to load MCP permission settings. Please try again later.
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Default Permissions</h2>
            <p className="text-sm text-muted-foreground">
              These are your default MCP permissions. You can override them per
              folder in folder settings.
            </p>
          </div>
          <button
            type="button"
            className={[
              'inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
              isDirty
                ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border-muted bg-background text-muted-foreground cursor-default',
            ].join(' ')}
            disabled={!isDirty || updateMutation.isPending}
            onClick={() => {
              if (!isDirty || updateMutation.isPending) {
                return
              }
              void handleSave()
            }}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {PERMISSION_FIELDS.map(({ key, label, description }) => (
            <div
              key={key}
              className="flex items-start justify-between gap-4 border-b pb-4 last:border-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch
                checked={permissions[key]}
                onCheckedChange={(value) => handleToggle(key, Boolean(value))}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
