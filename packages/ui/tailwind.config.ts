import containerQueries from '@tailwindcss/container-queries'

import { themePlugin } from './src/styles'

module.exports = {
  darkMode: ['selector', '[data-mode="dark"]'],
  mode: 'jit',
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    '../ui-toolkit/src/components/**/*.{js,ts,jsx,tsx}',
  ],
  plugins: [themePlugin, containerQueries],
}
