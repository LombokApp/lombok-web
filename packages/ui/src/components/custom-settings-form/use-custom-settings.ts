import { $api } from '@/src/services/api'

// ── User-level hooks ────────────────────────────────────────────────

export function useUserCustomSettings(appIdentifier: string) {
  return $api.useQuery(
    'get',
    '/api/v1/user/apps/{appIdentifier}/custom-settings',
    {
      params: { path: { appIdentifier } },
    },
  )
}

export function useUpdateUserCustomSettings(appIdentifier: string) {
  const query = useUserCustomSettings(appIdentifier)
  return $api.useMutation(
    'put',
    '/api/v1/user/apps/{appIdentifier}/custom-settings',
    {
      onSuccess: () => {
        void query.refetch()
      },
    },
  )
}

export function useDeleteUserCustomSettings(appIdentifier: string) {
  const query = useUserCustomSettings(appIdentifier)
  return $api.useMutation(
    'delete',
    '/api/v1/user/apps/{appIdentifier}/custom-settings',
    {
      onSuccess: () => {
        void query.refetch()
      },
    },
  )
}

// ── Folder-level hooks ──────────────────────────────────────────────

export function useFolderCustomSettings(
  folderId: string,
  appIdentifier: string,
) {
  return $api.useQuery(
    'get',
    '/api/v1/folders/{folderId}/apps/{appIdentifier}/custom-settings',
    {
      params: { path: { folderId, appIdentifier } },
    },
    {
      enabled: folderId.length > 0,
    },
  )
}

export function useUpdateFolderCustomSettings(
  folderId: string,
  appIdentifier: string,
) {
  const query = useFolderCustomSettings(folderId, appIdentifier)
  return $api.useMutation(
    'put',
    '/api/v1/folders/{folderId}/apps/{appIdentifier}/custom-settings',
    {
      onSuccess: () => {
        void query.refetch()
      },
    },
  )
}

export function useDeleteFolderCustomSettings(
  folderId: string,
  appIdentifier: string,
) {
  const query = useFolderCustomSettings(folderId, appIdentifier)
  return $api.useMutation(
    'delete',
    '/api/v1/folders/{folderId}/apps/{appIdentifier}/custom-settings',
    {
      onSuccess: () => {
        void query.refetch()
      },
    },
  )
}
