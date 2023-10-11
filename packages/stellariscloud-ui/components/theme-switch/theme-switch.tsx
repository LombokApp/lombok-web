import { Switch } from '@headlessui/react'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import React from 'react'

import { useThemeContext } from '../../contexts/theme.context'
import { Icon } from '../../design-system/icon'

export function ThemeToggle({
  onChange,
  isDark,
  isVertical = true,
}: {
  onChange: (isDark: boolean) => void
  isDark: boolean
  isVertical?: boolean
}) {
  return (
    <Switch
      checked={isDark}
      onChange={onChange}
      className={clsx(
        isDark ? 'bg-indigo-600' : 'bg-gray-200',
        'flex items-center',
        'relative inline-flex flex-shrink-0',
        !isVertical ? 'h-8 w-[4rem]' : 'h-16 w-8',
        'cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-indigo-300',
      )}
    >
      <span className="sr-only">Use setting</span>
      <span
        aria-hidden="true"
        className={clsx(
          isDark
            ? isVertical
              ? 'translate-y-4 translate-x-0.5'
              : 'translate-x-[2.1rem]'
            : isVertical
            ? '-translate-y-4 translate-x-0.5'
            : 'translate-x-1',
          'flex items-center justify-center',
          isVertical && 'flex-col',
          'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
        )}
      >
        <Icon
          icon={isDark ? MoonIcon : SunIcon}
          size="xs"
          className={clsx(
            !isDark ? 'opacity-0' : 'opacity-100',
            'transition absolute duration-500 text-gray-500 dark:text-gray-500',
          )}
        />
        <Icon
          icon={isDark ? MoonIcon : SunIcon}
          size="xs"
          className={clsx(
            !isDark ? 'opacity-100' : 'opacity-0',
            'transition absolute duration-500 text-gray-500 dark:text-gray-500',
          )}
        />
      </span>
      <div className="absolute">
        <div
          className={clsx(
            'flex items-center',
            isVertical ? 'flex-col' : 'flex-row',
          )}
        >
          <Icon
            className={clsx(
              'transition duration-200 text-white/50',
              isVertical
                ? '-translate-y-2  translate-x-[.3rem]'
                : 'translate-x-1.5',
              !isDark ? 'opacity-0' : 'opacity-100',
            )}
            icon={SunIcon}
            size="sm"
          />
          <Icon
            className={clsx(
              'transition duration-200 text-gray-400 dark:text-gray-300',
              isVertical ? 'translate-y-2 translate-x-1' : 'translate-x-[1rem]',
              isDark ? 'opacity-0' : 'opacity-100',
            )}
            icon={MoonIcon}
            size="sm"
          />
        </div>
      </div>
    </Switch>
  )
}

const isDarkSaved = () => {
  const savedValue = localStorage.getItem('theme')
  if (savedValue) {
    return savedValue === 'dark'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const ThemeSwitch = ({ isVertical }: { isVertical?: boolean }) => {
  const themeContext = useThemeContext()

  const [darkMode, setDarkMode] = React.useState({
    darkModeRequested: typeof localStorage !== 'undefined' && isDarkSaved(),
    darkModeActive:
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark'),
  })

  const updateToMatchRequestedTheme = React.useCallback(
    (theme: 'dark' | 'light') => {
      localStorage.setItem('theme', theme)
      if (theme === 'dark') {
        document.documentElement.classList.remove('light')
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
        document.documentElement.classList.add('light')
      }
      setDarkMode((s) => ({
        ...s,
        darkModeRequested: theme === 'dark',
        darkModeActive: theme === 'dark',
      }))
    },
    [setDarkMode],
  )

  React.useEffect(() => {
    updateToMatchRequestedTheme(darkMode.darkModeRequested ? 'dark' : 'light')
  }, [darkMode.darkModeRequested, updateToMatchRequestedTheme])

  React.useEffect(() => {
    setDarkMode({
      darkModeActive: document.documentElement.classList.contains('dark'),
      darkModeRequested: typeof localStorage !== 'undefined' && isDarkSaved(),
    })
  }, [])

  React.useEffect(() => {
    if (
      (themeContext.theme === 'dark' && !darkMode.darkModeRequested) ||
      (themeContext.theme !== 'dark' && darkMode.darkModeRequested)
    ) {
      themeContext.updateTheme(darkMode.darkModeRequested ? 'dark' : 'light')
    }
  }, [darkMode, themeContext])

  return (
    <ThemeToggle
      isDark={darkMode.darkModeActive}
      isVertical={isVertical}
      onChange={(isDark) =>
        setDarkMode((s) => ({ ...s, darkModeRequested: isDark }))
      }
    />
  )
}
