import containerQueries from '@tailwindcss/container-queries'
import { themePlugin } from './src'
import animatePlugin from 'tailwindcss-animate'

module.exports = {
  darkMode: ['selector', '[data-mode="dark"]'],
  content: ['./src/components/**/*.tsx'],
  plugins: [themePlugin, animatePlugin, containerQueries],
}
