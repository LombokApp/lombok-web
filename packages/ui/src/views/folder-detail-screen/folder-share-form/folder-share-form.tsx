import { zodResolver } from '@hookform/resolvers/zod'
import type {
  FolderPermissionName,
  FolderShareListResponse,
  FolderShareUserListResponse,
} from '@lombokapp/types'
import { FolderPermissionEnum } from '@lombokapp/types'
import {
  Button,
  cn,
  Form,
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  Icons,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lombokapp/ui-toolkit'
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import type { FetchOptions } from 'openapi-fetch'
import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const AVAILABLE_PERMISSIONS = [
  { label: 'Reindex', value: FolderPermissionEnum.FOLDER_REINDEX },
  { label: 'Forget', value: FolderPermissionEnum.FOLDER_FORGET },
  { label: 'Edit Objects', value: FolderPermissionEnum.OBJECT_EDIT },
  { label: 'Manage Objects', value: FolderPermissionEnum.OBJECT_MANAGE },
]

type PermissionValue = (typeof AVAILABLE_PERMISSIONS)[number]['value']

// Schema for validating a single share entry (used for adding)
const shareFormSchema = z.object({
  userId: z.string().nonempty('User ID is required'),
  permissions: z
    .array(z.nativeEnum(FolderPermissionEnum))
    .min(1, 'At least one permission is required'),
})

type ShareFormValues = z.infer<typeof shareFormSchema>

// Define parameter interfaces for mutations
export interface DeleteShareParams {
  folderId: string
  userId: string
}

export interface UpsertShareParams {
  folderId: string
  userId: string
  permissions: string[]
}

interface FolderShareFormProps {
  onCancel?: () => void
  className?: string
  folderId: string
  listFolderSharesQuery: UseQueryResult<FolderShareListResponse>
  listFolderShareUsersQuery: UseQueryResult<FolderShareUserListResponse>
  deleteFolderShareMutation: UseMutationResult<
    undefined,
    never,
    FetchOptions<{
      parameters: { path: { folderId: string; userId: string } }
    }>
  >
  upsertFolderShareMutation: UseMutationResult<
    { share: { userId: string; permissions: FolderPermissionName[] } },
    never,
    FetchOptions<{
      parameters: { path: { folderId: string; userId: string } }
      requestBody: {
        content: { 'application/json': { permissions: FolderPermissionName[] } }
      }
    }>
  >
}

export const FolderShareForm = ({
  onCancel,
  className,
  folderId,
  listFolderSharesQuery,
  listFolderShareUsersQuery,
  deleteFolderShareMutation,
  upsertFolderShareMutation,
}: FolderShareFormProps) => {
  // State specifically for the visual multi-select simulation
  const [currentAddPermissions, setCurrentAddPermissions] = React.useState<
    FolderPermissionName[]
  >([])

  // Form hook specifically for the 'Add New Share' section
  const addForm = useForm<ShareFormValues>({
    resolver: zodResolver(shareFormSchema),
    defaultValues: {
      userId: '',
      permissions: [],
    },
  })

  // Memoize user data for efficient lookup
  const users = React.useMemo(
    () => listFolderShareUsersQuery.data?.result ?? [],
    [listFolderShareUsersQuery.data?.result],
  )
  const usersById = React.useMemo(() => {
    const map: Record<string, (typeof users)[number]> = {}
    users.forEach((user) => {
      map[user.id] = user
    })
    return map
  }, [users])

  // Shares to display (use the query data as the source of truth)
  const existingShares = listFolderSharesQuery.data?.result ?? []

  const handleDeleteShare = (userId: string) => {
    try {
      deleteFolderShareMutation.mutate({
        params: {
          path: {
            folderId,
            userId,
          },
        },
      })
      // Invalidate queries to refetch data after deletion
      void listFolderSharesQuery.refetch()
      void listFolderShareUsersQuery.refetch()
    } catch (error) {
      console.error('Failed to remove share:', error)
    }
  }

  // Handler for submitting the 'Add New Share' form
  const handleAddNewShare = async (data: ShareFormValues) => {
    // Check if user already exists in the displayed list
    if (existingShares.some((share) => share.userId === data.userId)) {
      addForm.setError('userId', {
        type: 'manual',
        message: 'This user already has permissions assigned.',
      })
      return
    }

    try {
      await upsertFolderShareMutation.mutateAsync({
        params: {
          path: {
            folderId,
            userId: data.userId,
          },
        },
        body: { permissions: data.permissions },
      })
      addForm.reset() // Clear the add form
      setCurrentAddPermissions([]) // Clear visual multi-select state
      void listFolderSharesQuery.refetch()
      void listFolderShareUsersQuery.refetch()
    } catch (error) {
      console.error('Failed to add share:', error)
      addForm.setError('root', {
        message: 'Failed to add share. Please try again.',
      })
    }
  }

  // Helper to get username
  const getUserName = (userId: string): string => {
    if (listFolderShareUsersQuery.isLoading) {
      return 'Loading...'
    }
    return usersById[userId]?.username ?? ''
  }

  // Update both the form state and the visual state for permissions
  const handlePermissionsChange = (permissionValue: PermissionValue) => {
    const currentFormPermissions = addForm.getValues('permissions')
    const newSet = new Set(currentFormPermissions)

    if (newSet.has(permissionValue)) {
      newSet.delete(permissionValue)
    } else {
      newSet.add(permissionValue)
    }
    const newPermissionsArray = Array.from(newSet)
    addForm.setValue('permissions', newPermissionsArray, {
      shouldValidate: true,
    })
    setCurrentAddPermissions(newPermissionsArray)
  }

  return (
    <div className={cn('w-full max-w-2xl', className)}>
      {/* Display Existing Shares - Not part of any form */}
      <div className="mb-6 space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">
          Existing Shares
        </h4>
        {listFolderSharesQuery.isLoading && (
          <p className="text-sm text-muted-foreground">Loading shares...</p>
        )}
        {!listFolderSharesQuery.isLoading && existingShares.length === 0 && (
          <p className="text-sm text-muted-foreground">No shares yet.</p>
        )}
        {existingShares.map((share) => (
          <div
            key={share.userId}
            className="flex items-center justify-between rounded-md border bg-muted p-3"
          >
            <div className="flex flex-col text-sm">
              <span className="font-medium">{getUserName(share.userId)}</span>
              <span className="text-xs text-muted-foreground">
                {share.permissions.join(', ')}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteShare(share.userId)}
              disabled={deleteFolderShareMutation.isPending}
              className="text-destructive hover:text-destructive"
            >
              {deleteFolderShareMutation.isPending &&
                deleteFolderShareMutation.variables.params.path.userId ===
                  share.userId && (
                  <Icons.spinner className="mr-2 size-4 animate-spin" />
                )}
              Remove
            </Button>
          </div>
        ))}
      </div>

      {/* Add New Share Form Section */}
      <Form {...addForm}>
        <form
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onSubmit={addForm.handleSubmit(handleAddNewShare)}
          className="space-y-4 rounded-lg border bg-card p-4 shadow-sm"
        >
          <h4 className="text-sm font-medium">Add New Share</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* User Select for New Share */}
            <FormItem>
              <FormLabel>User</FormLabel>
              <Select
                onValueChange={(value) =>
                  addForm.setValue('userId', value, { shouldValidate: true })
                }
                value={addForm.watch('userId')}
                disabled={listFolderShareUsersQuery.isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {listFolderShareUsersQuery.isLoading && (
                    <SelectItem value="loading" disabled>
                      Loading users...
                    </SelectItem>
                  )}
                  {users.map((user) => (
                    <SelectItem
                      key={user.id}
                      value={user.id}
                      disabled={existingShares.some(
                        (s) => s.userId === user.id,
                      )}
                    >
                      {user.username}
                      {existingShares.some((s) => s.userId === user.id)
                        ? ' (shared)'
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {addForm.formState.errors.userId && (
                <p className="text-sm font-medium text-destructive">
                  {addForm.formState.errors.userId.message}
                </p>
              )}
            </FormItem>

            {/* Permissions Select for New Share */}
            <FormItem>
              <FormLabel>Permissions</FormLabel>
              <Select
                onValueChange={(value) =>
                  handlePermissionsChange(value as PermissionValue)
                }
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select permissions">
                      {currentAddPermissions.length > 0
                        ? `${currentAddPermissions.length} selected`
                        : 'Select permissions'}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {AVAILABLE_PERMISSIONS.map((permission) => (
                    <SelectItem
                      key={permission.value}
                      value={permission.value}
                      onSelect={(e) => e.preventDefault()}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'size-4 rounded-sm border border-primary',
                            currentAddPermissions.includes(permission.value)
                              ? 'bg-primary'
                              : 'bg-transparent',
                          )}
                          aria-hidden="true"
                        />
                        {permission.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Selected:{' '}
                {currentAddPermissions.length
                  ? currentAddPermissions.join(', ')
                  : 'None'}
              </FormDescription>
              {addForm.formState.errors.permissions && (
                <p className="text-sm font-medium text-destructive">
                  {addForm.formState.errors.permissions.message}
                </p>
              )}
            </FormItem>
          </div>
          {addForm.formState.errors.root && (
            <p className="text-sm font-medium text-destructive">
              {addForm.formState.errors.root.message}
            </p>
          )}
          <Button
            type="submit"
            disabled={
              upsertFolderShareMutation.isPending || !addForm.formState.isValid
            }
            className="w-full sm:w-auto"
          >
            {upsertFolderShareMutation.isPending && (
              <Icons.spinner className="mr-2 size-4 animate-spin" />
            )}
            Add Share
          </Button>
        </form>
      </Form>

      {onCancel && (
        <div className="mt-6 flex justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Close
          </Button>
        </div>
      )}
    </div>
  )
}
