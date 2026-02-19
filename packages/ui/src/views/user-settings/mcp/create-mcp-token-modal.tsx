import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@lombokapp/ui-toolkit/components/dialog'
import { Dialog } from '@lombokapp/ui-toolkit/components/dialog/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@lombokapp/ui-toolkit/components/form/form'
import { Input } from '@lombokapp/ui-toolkit/components/input/input'
import { useQueryClient } from '@tanstack/react-query'
import { Copy } from 'lucide-react'
import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { $api } from '@/src/services/api'

const formSchema = z.object({
  clientName: z
    .string()
    .min(1, { message: 'Client name is required.' })
    .max(100, { message: 'Client name must be 100 characters or fewer.' }),
})

type FormValues = z.infer<typeof formSchema>

interface CreatedToken {
  tokenId: string
  rawToken: string
  clientName: string
}

export function CreateMcpTokenModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()

  const [createdToken, setCreatedToken] = React.useState<CreatedToken | null>(
    null,
  )
  const [copied, setCopied] = React.useState(false)
  const [configCopied, setConfigCopied] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: '',
    },
  })

  const createMutation = $api.useMutation('post', '/api/v1/user/mcp/tokens')

  const handleSubmit = async (values: FormValues) => {
    await createMutation.mutateAsync(
      {
        body: { clientName: values.clientName },
      },
      {
        onSuccess: (result) => {
          setCreatedToken({
            tokenId: result.tokenId,
            rawToken: result.rawToken,
            clientName: result.clientName,
          })
        },
      },
    )
  }

  const mcpConfig = createdToken
    ? JSON.stringify(
        {
          mcpServers: {
            lombok: {
              type: 'http',
              url: `${window.location.origin}/api/mcp`,
              headers: {
                Authorization: `Bearer ${createdToken.rawToken}`,
              },
            },
          },
        },
        null,
        2,
      )
    : ''

  const handleCopyToken = async () => {
    if (!createdToken) {
      return
    }
    await navigator.clipboard.writeText(createdToken.rawToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyConfig = async () => {
    await navigator.clipboard.writeText(mcpConfig)
    setConfigCopied(true)
    setTimeout(() => setConfigCopied(false), 2000)
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // If we created a token and are now closing, invalidate the token list
      if (createdToken) {
        void queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey
            if (!Array.isArray(queryKey)) {
              return false
            }
            return queryKey.includes('/api/v1/user/mcp/tokens')
          },
        })
      }
      // Reset state for next open
      setCreatedToken(null)
      setCopied(false)
      setConfigCopied(false)
      form.reset()
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="top-0 mt-[50%] min-w-fit sm:top-1/2 sm:mt-0 sm:max-w-lg"
        aria-description="Create a new MCP token for an AI assistant"
      >
        <DialogHeader>
          <DialogTitle>Create MCP Token</DialogTitle>
        </DialogHeader>

        {createdToken == null ? (
          // Step 1: Create form
          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void form.handleSubmit(handleSubmit)(e)
              }}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Claude Desktop, Claude Code"
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleClose(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Creating...' : 'Create Token'}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          // Step 2: Copy-once display
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Copy this token now. You will not be able to see it again.
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">Token</p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={createdToken.rawToken}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void handleCopyToken()}
                  title="Copy token"
                >
                  <Copy className="size-4" />
                </Button>
              </div>
              {copied && (
                <p className="mt-1 text-xs text-muted-foreground">Copied!</p>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">
                MCP Config (Claude Desktop)
              </p>
              <div className="relative">
                <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
                  {mcpConfig}
                </pre>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 flex items-center gap-1.5"
                  onClick={() => void handleCopyConfig()}
                >
                  <Copy className="size-3.5" />
                  {configCopied ? 'Copied!' : 'Copy Config'}
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={() => handleClose(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
