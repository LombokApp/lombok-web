import React from 'react'

import { $api } from '@/src/services/api'

import { PublicSettingsContext } from './public-settings.context'
import type { IPublicSettingsContext } from './public-settings.types'

export const PublicSettingsContextProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const {
    data: settings,
    isLoading,
    refetch,
  } = $api.useQuery('get', '/api/v1/public/settings')

  const contextValue: IPublicSettingsContext = {
    settings: settings?.settings ?? null,
    isLoading,
    refetch: () => {
      void refetch()
    },
  }

  return (
    <PublicSettingsContext.Provider value={contextValue}>
      {children}
    </PublicSettingsContext.Provider>
  )
}
