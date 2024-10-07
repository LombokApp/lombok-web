import containerQueries from '@tailwindcss/container-queries'
import animatePlugin from 'tailwindcss-animate'

import { themePlugin } from './theme-plugin'

export default {
  darkMode: ['[data-mode="dark"]'],
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  plugins: [themePlugin, animatePlugin, containerQueries],
}
