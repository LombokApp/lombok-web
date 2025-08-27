import type { Dispatch, SetStateAction } from 'react'

export interface IThemeContext {
  theme: string
  setTheme: Dispatch<SetStateAction<string>>
}
