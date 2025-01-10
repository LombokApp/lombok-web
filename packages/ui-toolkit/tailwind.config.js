import { themePlugin, themePreset } from './src/styles'

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [themePreset],
  plugins: [themePlugin],
}
