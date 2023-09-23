module.exports = {
  darkMode: 'class',
  mode: 'jit',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './design-system/**/*.{js,ts,jsx,tsx}',
    './views/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter var, ui-sans-serif',
          {
            fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
          },
        ],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
