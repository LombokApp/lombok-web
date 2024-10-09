import { colorMix } from '@/utils'
import plugin from 'tailwindcss/plugin'

import { baseTheme } from './themes'

export const themePlugin = plugin(
  ({ addBase }) => {
    // Add html base styles
    addBase({
      html: {
        color: 'var(--foreground)',
        backgroundColor: 'var(--background)',
      },
    })
    // Add light theme
    addBase({
      ':root': {
        '--background': baseTheme.light.background,
        '--foreground': baseTheme.light.foreground,
        '--card': baseTheme.light.card,
        '--card-foreground': baseTheme.light.cardForeground,
        '--popover': baseTheme.light.popover,
        '--popover-foreground': baseTheme.light.popoverForeground,
        '--primary': baseTheme.light.primary,
        '--primary-foreground': baseTheme.light.primaryForeground,
        '--secondary': baseTheme.light.secondary,
        '--secondary-foreground': baseTheme.light.secondaryForeground,
        '--muted': baseTheme.light.muted,
        '--muted-foreground': baseTheme.light.mutedForeground,
        '--accent': baseTheme.light.accent,
        '--accent-foreground': baseTheme.light.accentForeground,
        '--destructive': baseTheme.light.destructive,
        '--destructive-foreground': baseTheme.light.destructiveForeground,
        '--border': baseTheme.light.border,
        '--input': baseTheme.light.input,
        '--ring': baseTheme.light.ring,
        '--radius': '0.5rem',
        '--chart-1': baseTheme.light.chart1,
        '--chart-2': baseTheme.light.chart2,
        '--chart-3': baseTheme.light.chart3,
        '--chart-4': baseTheme.light.chart4,
        '--chart-5': baseTheme.light.chart5,
      },
    })
    // Add dark theme
    addBase({
      '[data-mode="dark"]': {
        '--background': baseTheme.dark.background,
        '--foreground': baseTheme.dark.foreground,
        '--card': baseTheme.dark.card,
        '--card-foreground': baseTheme.dark.cardForeground,
        '--popover': baseTheme.dark.popover,
        '--popover-foreground': baseTheme.dark.popoverForeground,
        '--primary': baseTheme.dark.primary,
        '--primary-foreground': baseTheme.dark.primaryForeground,
        '--secondary': baseTheme.dark.secondary,
        '--secondary-foreground': baseTheme.dark.secondaryForeground,
        '--muted': baseTheme.dark.muted,
        '--muted-foreground': baseTheme.dark.mutedForeground,
        '--accent': baseTheme.dark.accent,
        '--accent-foreground': baseTheme.dark.accentForeground,
        '--destructive': baseTheme.dark.destructive,
        '--destructive-foreground': baseTheme.dark.destructiveForeground,
        '--border': baseTheme.dark.border,
        '--input': baseTheme.dark.input,
        '--ring': baseTheme.dark.ring,
        '--chart-1': baseTheme.dark.chart1,
        '--chart-2': baseTheme.dark.chart2,
        '--chart-3': baseTheme.dark.chart3,
        '--chart-4': baseTheme.dark.chart4,
        '--chart-5': baseTheme.dark.chart5,
      },
    })
  },
  // Add theme extension
  {
    theme: {
      extend: {
        colors: {
          border: colorMix('border'),
          input: colorMix('input'),
          ring: colorMix('ring'),
          background: colorMix('background'),
          foreground: colorMix('foreground'),
          primary: {
            DEFAULT: colorMix('primary'),
            foreground: colorMix('primary-foreground'),
          },
          secondary: {
            DEFAULT: colorMix('secondary'),
            foreground: colorMix('secondary-foreground'),
          },
          destructive: {
            DEFAULT: colorMix('destructive'),
            foreground: colorMix('destructive-foreground'),
          },
          muted: {
            DEFAULT: colorMix('muted'),
            foreground: colorMix('muted-foreground'),
          },
          accent: {
            DEFAULT: colorMix('accent'),
            foreground: colorMix('accent-foreground'),
          },
          popover: {
            DEFAULT: colorMix('popover'),
            foreground: colorMix('popover-foreground'),
          },
          card: {
            DEFAULT: colorMix('card'),
            foreground: colorMix('card-foreground'),
          },
        },
      },
    },
  },
)
