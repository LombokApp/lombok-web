import React from 'react'

import { ThemeContext } from './theme.context'
import type { IThemeContext } from './theme.types'

export function useTheme(): IThemeContext {
  return React.useContext(ThemeContext)
}
