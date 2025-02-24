import containerQueries from '@tailwindcss/container-queries'
import animatePlugin from 'tailwindcss-animate'

import { themePlugin } from './src'

module.exports = {
  darkMode: ['selector', '[data-mode="dark"]'],
  content: ['./src/components/**/*.tsx'],
  plugins: [themePlugin, animatePlugin, containerQueries],
}
