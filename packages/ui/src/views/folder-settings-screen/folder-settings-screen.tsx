import { Tabs, TabsContent, TabsList, TabsTrigger } from '@lombokapp/ui-toolkit/components/tabs/tabs'
import React from 'react'

import { FolderAppConfigTab } from './folder-app-config-tab'
import { FolderMcpSettingsTab } from './folder-mcp-settings-tab'

interface FolderSettingsScreenProps {
  folderId: string
}

export function FolderSettingsScreen({ folderId }: FolderSettingsScreenProps) {
  return (
    <div className="flex size-full flex-col gap-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Folder Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure per-folder settings and permissions.
        </p>
      </div>
      <Tabs defaultValue="mcp" className="w-full">
        <TabsList>
          <TabsTrigger value="mcp">MCP Permissions</TabsTrigger>
          <TabsTrigger value="apps">App Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="mcp" className="mt-6">
          <FolderMcpSettingsTab folderId={folderId} />
        </TabsContent>
        <TabsContent value="apps" className="mt-6">
          <FolderAppConfigTab folderId={folderId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
