import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import React from 'react'

import { CreateMcpTokenModal } from './create-mcp-token-modal'
import { McpTokenList } from './mcp-token-list'
import { McpUserPermissionsForm } from './mcp-user-permissions-form'

export function UserMcpAccessTab() {
  const [createModalOpen, setCreateModalOpen] = React.useState(false)

  return (
    <div className="flex h-full max-h-full flex-1 flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">MCP Access</h1>
        <p className="text-muted-foreground">
          Connect AI assistants to your Lombok files. Create a token, configure
          it in your MCP client, and set default permissions for what operations
          are allowed.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">MCP Tokens</h2>
            <p className="text-sm text-muted-foreground">
              Active tokens for AI assistant connections.
            </p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>Create Token</Button>
        </div>

        <McpTokenList />

        <CreateMcpTokenModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold">Default Permissions</h2>
          <p className="text-sm text-muted-foreground">
            Set the default operations allowed for all MCP connections.
          </p>
        </div>

        <McpUserPermissionsForm />
      </div>
    </div>
  )
}
