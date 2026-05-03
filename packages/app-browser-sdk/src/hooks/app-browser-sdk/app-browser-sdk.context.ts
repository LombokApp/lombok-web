import React from 'react'

import type { ISdkContext } from './app-browser-sdk.hook'

export const SdkContext = React.createContext<ISdkContext>({} as ISdkContext)
