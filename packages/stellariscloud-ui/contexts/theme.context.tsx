import React from 'react'

type Theme = 'dark' | 'light'

export interface IThemeContext {
  theme: Theme
  updateTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<IThemeContext>({} as IThemeContext)

export const useThemeContext = (): IThemeContext =>
  React.useContext(ThemeContext)

export const ThemeContextProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [theme, setTheme] = React.useState<Theme>('dark')
  const updateTheme = (newTheme: Theme) => setTheme(newTheme)

  return (
    <ThemeContext.Provider
      value={{
        theme,
        updateTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
