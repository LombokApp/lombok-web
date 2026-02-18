import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import { Switch } from '@lombokapp/ui-toolkit/components/switch/switch'
import { useToast } from '@lombokapp/ui-toolkit/hooks'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

import { $api } from '@/src/services/api'

interface FolderMcpPermissions {
  canRead: boolean | null
  canWrite: boolean | null
  canDelete: boolean | null
  canMove: boolean | null
}

interface FolderMcpSettingsTabProps {
  folderId: string
}

export function FolderMcpSettingsTab({ folderId }: FolderMcpSettingsTabProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const settingsQuery = $api.useQuery(
    'get',
    '/api/v1/folders/{folderId}/mcp/settings',
    {
      params: { path: { folderId } },
    },
    { enabled: folderId.length > 0 },
  )

  const updateMutation = $api.useMutation(
    'put',
    '/api/v1/folders/{folderId}/mcp/settings',
  )

  const deleteMutation = $api.useMutation(
    'delete',
    '/api/v1/folders/{folderId}/mcp/settings',
  )

  const serverPermissions = settingsQuery.data as FolderMcpPermissions | undefined

  const [permissions, setPermissions] = React.useState<FolderMcpPermissions>({
    canRead: null,
    canWrite: null,
    canDelete: null,
    canMove: null,
  })

  const [initialized, setInitialized] = React.useState(false)

  React.useEffect(() => {
    if (serverPermissions && !initialized) {
      setPermissions({
        canRead: serverPermissions.canRead,
        canWrite: serverPermissions.canWrite,
        canDelete: serverPermissions.canDelete,
        canMove: serverPermissions.canMove,
      })
      setInitialized(true)
    } else if (!settingsQuery.isLoading && !initialized) {
      setInitialized(true)
    }
  }, [serverPermissions, settingsQuery.isLoading, initialized])

  const handleToggle = (key: keyof FolderMcpPermissions, checked: boolean) => {
    setPermissions((prev) => ({ ...prev, [key]: checked }))
  }

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      params: { path: { folderId } },
      body: {
        canRead: permissions.canRead,
        canWrite: permissions.canWrite,
        canDelete: permissions.canDelete,
        canMove: permissions.canMove,
      },
    })
    await queryClient.invalidateQueries({
      queryKey: ['get', '/api/v1/folders/{folderId}/mcp/settings', { params: { path: { folderId } } }],
    })
    toast({
      title: 'MCP settings saved',
      description: 'Folder MCP permission overrides have been updated.',
    })
  }

  const handleClear = async () => {
    const confirmed = window.confirm(
      'Clear folder MCP overrides? This will revert this folder to your account-level MCP defaults.',
    )
    if (!confirmed) {
      return
    }
    await deleteMutation.mutateAsync({
      params: { path: { folderId } },
    })
    setPermissions({
      canRead: null,
      canWrite: null,
      canDelete: null,
      canMove: null,
    })
    setInitialized(false)
    await queryClient.invalidateQueries({
      queryKey: ['get', '/api/v1/folders/{folderId}/mcp/settings', { params: { path: { folderId } } }],
    })
    toast({
      title: 'MCP overrides cleared',
      description: 'This folder now uses your account-level MCP defaults.',
    })
  }

  if (settingsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">Loading MCP settings...</p>
      </div>
    )
  }

  if (settingsQuery.error) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">
          Unable to load MCP settings. Please try again later.
        </p>
      </div>
    )
  }

  const isBusy = updateMutation.isPending || deleteMutation.isPending

  const permissionRows: { key: keyof FolderMcpPermissions; label: string; description: string }[] = [
    {
      key: 'canRead',
      label: 'Allow Read',
      description: 'Allow MCP clients to list and download files in this folder.',
    },
    {
      key: 'canWrite',
      label: 'Allow Write',
      description: 'Allow MCP clients to upload files to this folder.',
    },
    {
      key: 'canDelete',
      label: 'Allow Delete',
      description: 'Allow MCP clients to delete files in this folder.',
    },
    {
      key: 'canMove',
      label: 'Allow Move',
      description: 'Allow MCP clients to move files within this folder.',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        These permissions override your account-level MCP defaults for this folder. Clear overrides
        to use your account defaults.
      </p>

      <div className="flex flex-col gap-4">
        {permissionRows.map(({ key, label, description }) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-md border bg-card p-4"
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">{description}</span>
            </div>
            <Switch
              checked={permissions[key] !== false}
              onCheckedChange={(checked) => handleToggle(key, checked)}
              disabled={isBusy}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          onClick={() => void handleClear()}
          disabled={isBusy}
        >
          {deleteMutation.isPending ? 'Clearing...' : 'Clear Overrides'}
        </Button>
        <Button
          onClick={() => void handleSave()}
          disabled={isBusy}
        >
          {updateMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
