import plugin from 'tailwindcss/plugin'

import { baseTheme } from './themes'

export function colorMix(color: string, opacity?: number) {
  return `color-mix(in srgb, var(--${color}) calc(${opacity || '<alpha-value>'} * 100%), transparent)`
}

export const themePlugin = plugin(
  (pluginAPI) => {
    // Add html base styles
    pluginAPI.addBase({
      html: {
        color: 'var(--foreground)',
        backgroundColor: 'var(--background)',
      },
    })
    // Add light theme
    pluginAPI.addBase({
      ':root': {
        '--border-input': baseTheme.light.inputBorder,
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
    pluginAPI.addBase({
      '[data-mode="dark"]': {
        '--border-input': baseTheme.dark.inputBorder,
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
        borderColor: {
          DEFAULT: colorMix('border'),
          input: colorMix('border-input'),
        },
        colors: {
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
        containers: {
          xs: '20rem',
          sm: '24rem',
          md: '28rem',
          lg: '32rem',
          xl: '36rem',
          '2xl': '42rem',
          '3xl': '48rem',
          '4xl': '56rem',
          '5xl': '64rem',
          '6xl': '72rem',
          '7xl': '80rem',
          '8xl': '88rem',
          '9xl': '96rem',
          '10xl': '104rem',
          '11xl': '112rem',
          '12xl': '120rem',
          '13xl': '128rem',
          '14xl': '136rem',
          '15xl': '144rem',
          '16xl': '152rem',
        },
      },
    },
  },
)
