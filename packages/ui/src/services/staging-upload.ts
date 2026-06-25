import type { components } from '@lombokapp/types'

import { $apiClient } from './api'

/** Feature a staged upload is for; the server maps this to a size tier. */
export type StagingPurpose =
  components['schemas']['StagingUploadInputDTO']['purpose']

/**
 * Upload a file to the server's staging area and return the `stagingKey` to
 * reference in a follow-up create/update request. `purpose` names the feature,
 * which the server maps to a size tier (the client never picks a size). Errors
 * carry a `status` field so callers can surface a toast.
 */
export async function stageUpload(
  file: File,
  purpose: StagingPurpose,
): Promise<string> {
  const { data, error, response } = await $apiClient.POST(
    '/api/v1/staging-uploads',
    {
      body: { purpose },
    },
  )
  if (!response.ok || !data) {
    throw Object.assign(new Error('Upload failed'), {
      status: response.status,
      message: error?.message ?? 'Upload failed',
    })
  }

  const putResponse = await fetch(data.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!putResponse.ok) {
    throw Object.assign(new Error('Upload failed'), {
      status: putResponse.status,
      message: 'Could not store the uploaded image.',
    })
  }

  return data.stagingKey
}
