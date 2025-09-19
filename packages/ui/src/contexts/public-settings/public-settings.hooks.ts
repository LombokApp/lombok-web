import React from 'react'

import { PublicSettingsContext } from './public-settings.context'
import type { IPublicSettingsContext } from './public-settings.types'

export const usePublicSettingsContext = (): IPublicSettingsContext =>
  React.useContext(PublicSettingsContext)
