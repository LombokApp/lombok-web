import React from 'react'

import type { IPublicSettingsContext } from './public-settings.types'

export const PublicSettingsContext =
  React.createContext<IPublicSettingsContext>({} as IPublicSettingsContext)
