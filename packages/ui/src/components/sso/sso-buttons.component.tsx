import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import { Icons } from '@lombokapp/ui-toolkit/components/icons/icons'
import React from 'react'

import { $api } from '@/src/services/api'

export const SSOButtons = () => {
  const initiateSSOMutation = $api.useMutation(
    'post',
    '/api/v1/auth/sso/initiate/{provider}',
    {
      onSuccess: ({ authUrl }) => {
        window.location.href = authUrl
      },
    },
  )
  const handleGoogleLogin = React.useCallback(() => {
    void (async () => {
      try {
        // Get the OAuth URL from the backend
        await initiateSSOMutation.mutateAsync({
          params: { path: { provider: 'google' } },
        })
      } catch (error) {
        console.error('Failed to initiate Google login:', error)
      }
    })()
  }, [initiateSSOMutation])

  return (
    <div className="space-y-2">
      <Button
        onClick={handleGoogleLogin}
        variant="outline"
        className="w-full"
        type="button"
      >
        <Icons.google className="mr-2 size-4" />
        Sign in with Google
      </Button>
    </div>
  )
}
