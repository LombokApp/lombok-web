import containerQueries from '@tailwindcss/container-queries'
import animatePlugin from 'tailwindcss-animate'

module.exports = {
  darkMode: ['[data-mode="dark"]'],
  plugins: [animatePlugin, containerQueries],
}
