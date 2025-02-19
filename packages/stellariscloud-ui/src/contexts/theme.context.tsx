import type { Dispatch, SetStateAction } from 'react'
import React from 'react'

const ThemeContext = React.createContext({
  theme: 'light',
  setTheme: (() => undefined) as Dispatch<SetStateAction<string>>,
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState(() => {
    return localStorage.getItem('theme') || 'light'
  })

  React.useEffect(() => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return React.useContext(ThemeContext)
}
