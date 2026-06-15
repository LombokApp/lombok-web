import { Button } from '@lombokapp/ui-toolkit/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@lombokapp/ui-toolkit/components/card'
import { Input } from '@lombokapp/ui-toolkit/components/input'
import { Skeleton } from '@lombokapp/ui-toolkit/components/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@lombokapp/ui-toolkit/components/table'
import { useToast } from '@lombokapp/ui-toolkit/hooks'
import { formatBytes } from '@lombokapp/utils'
import { Download, FileText } from 'lucide-react'
import React from 'react'

import { $api, $apiClient } from '@/src/services/api'
import { downloadData } from '@/src/utils/file'

interface StorageObject {
  key: string
  size: number
  eTag: string
  lastModified: number
}

const formatDate = (epochMs: number) =>
  new Date(epochMs).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

// Keys are opaque flat strings; use the last segment as a friendly name.
const lastSegment = (key: string) => key.split('/').pop() || key

export function AppStoragePanel({ appIdentifier }: { appIdentifier: string }) {
  const { toast } = useToast()

  // Debounced prefix filter — resets the accumulated list on change.
  const [prefixInput, setPrefixInput] = React.useState('')
  const [prefix, setPrefix] = React.useState('')

  React.useEffect(() => {
    const handle = setTimeout(() => setPrefix(prefixInput), 300)
    return () => clearTimeout(handle)
  }, [prefixInput])

  // Accumulated rows + current S3 continuation token.
  const [rows, setRows] = React.useState<StorageObject[]>([])
  const [token, setToken] = React.useState<string | undefined>(undefined)
  const [downloadingKey, setDownloadingKey] = React.useState<string | null>(
    null,
  )

  const listQuery = $api.useQuery(
    'get',
    '/api/v1/user/apps/{appIdentifier}/storage/objects',
    {
      params: {
        path: { appIdentifier },
        query: {
          ...(token && { continuationToken: token }),
          ...(prefix && { prefix }),
        },
      },
    },
  )

  // Append each fetched page; a page with no token is the first/only one.
  // Dedupe by key so a background refetch of the current page can't duplicate rows.
  const pageData = listQuery.data
  React.useEffect(() => {
    if (!pageData) {
      return
    }
    setRows((prev) => {
      const base = token ? prev : []
      const seen = new Set(base.map((r) => r.key))
      return [...base, ...pageData.result.filter((r) => !seen.has(r.key))]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageData])

  // Reset accumulation when the prefix changes.
  React.useEffect(() => {
    setRows([])
    setToken(undefined)
  }, [prefix])

  const nextToken = pageData?.continuationToken
  const hasMore = Boolean(nextToken) && nextToken !== token

  const handleDownload = React.useCallback(
    async (key: string) => {
      setDownloadingKey(key)
      toast({
        title: 'Preparing download',
        description: lastSegment(key),
      })
      try {
        const res = await $apiClient.POST(
          '/api/v1/user/apps/{appIdentifier}/storage/presigned-urls',
          {
            params: { path: { appIdentifier } },
            body: { requests: [{ objectKey: key, method: 'GET' }] },
          },
        )
        const url = res.data?.urls[0]
        if (!url) {
          throw new Error('No download URL returned')
        }
        downloadData(url, lastSegment(key))
      } catch {
        toast({
          title: 'Download failed',
          description: 'Could not prepare a download for this file.',
          variant: 'destructive',
        })
      } finally {
        setDownloadingKey(null)
      }
    },
    [appIdentifier, toast],
  )

  const isInitialLoading = listQuery.isLoading && rows.length === 0
  const isEmpty = !isInitialLoading && !listQuery.error && rows.length === 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>My data</CardTitle>
        <CardDescription>
          Files this app has stored in your personal storage. Read-only — only
          you can see these.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          value={prefixInput}
          onChange={(e) => setPrefixInput(e.target.value)}
          placeholder="Filter by prefix…"
          className="max-w-xs"
        />

        {listQuery.error ? (
          <div className="text-sm text-muted-foreground">
            Failed to load files.
          </div>
        ) : isInitialLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isEmpty ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            This app hasn&apos;t stored any files for you yet.
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Modified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {lastSegment(row.key)}
                          </div>
                          <div
                            className="truncate text-xs text-muted-foreground"
                            title={row.key}
                          >
                            {row.key}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatBytes(row.size)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(row.lastModified)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={downloadingKey === row.key}
                        onClick={() => void handleDownload(row.key)}
                      >
                        <Download className="size-4" />
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {hasMore && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  disabled={listQuery.isFetching}
                  onClick={() => setToken(nextToken)}
                >
                  {listQuery.isFetching ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
