import { themePlugin } from './styles'

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  mode: 'jit',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    '../ui-toolkit/src/components/**/*.{js,ts,jsx,tsx}',
    './design-system/**/*.{js,ts,jsx,tsx}',
    './views/**/*.{js,ts,jsx,tsx}',
  ],
  plugins: [themePlugin],
}
