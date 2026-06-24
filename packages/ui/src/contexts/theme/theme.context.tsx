import React from 'react'

import type { IThemeContext } from './theme.types'

export const ThemeContext = React.createContext<IThemeContext>({
  theme: 'light',
  setTheme: () => undefined,
})
