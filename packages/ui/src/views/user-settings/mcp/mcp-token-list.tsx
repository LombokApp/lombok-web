import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import { Skeleton } from '@lombokapp/ui-toolkit/components/skeleton'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

import { $api } from '@/src/services/api'

export function McpTokenList() {
  const queryClient = useQueryClient()

  const tokensQuery = $api.useQuery('get', '/api/v1/user/mcp/tokens')

  const revokeMutation = $api.useMutation(
    'delete',
    '/api/v1/user/mcp/tokens/{tokenId}',
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey
            if (!Array.isArray(queryKey)) {
              return false
            }
            return queryKey.includes('/api/v1/user/mcp/tokens')
          },
        })
      },
    },
  )

  const [revoking, setRevoking] = React.useState<string | null>(null)

  const handleRevoke = async (tokenId: string) => {
    setRevoking(tokenId)
    try {
      await revokeMutation.mutateAsync({
        params: {
          path: { tokenId },
        },
      })
    } finally {
      setRevoking(null)
    }
  }

  if (tokensQuery.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (tokensQuery.error || !tokensQuery.data) {
    return (
      <div className="text-sm text-destructive">
        Unable to load MCP tokens. Please try again later.
      </div>
    )
  }

  const tokens = tokensQuery.data.tokens

  if (tokens.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No MCP tokens yet. Create one to connect an AI assistant.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">Client Name</th>
            <th className="px-3 py-2 text-left font-medium">Created</th>
            <th className="px-3 py-2 text-left font-medium">Last Used</th>
            <th className="px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => (
            <tr key={token.id} className="border-b last:border-0">
              <td className="p-3 align-middle">
                <span className="font-medium">{token.clientName}</span>
              </td>
              <td className="p-3 align-middle text-muted-foreground">
                {new Date(token.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </td>
              <td className="p-3 align-middle text-muted-foreground">
                {token.lastUsedAt != null
                  ? new Date(token.lastUsedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Never'}
              </td>
              <td className="p-3 text-right align-middle">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={revoking === token.id}
                  onClick={() => void handleRevoke(token.id)}
                >
                  {revoking === token.id ? 'Revoking...' : 'Revoke'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
