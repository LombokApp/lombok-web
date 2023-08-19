module.exports = {
  mode: 'jit',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './views/**/*.{js,ts,jsx,tsx}',
    '../shared/packages/design-system/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    fontFamily: {
      heading: ['"Sequel Sans"', 'sans-serif'],
      body: [
        '"Sequel Sans", -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif',
        'sans-serif',
      ],
    },
    extend: {
      colors: {
        deploy: '#ec4899',
      },
      spacing: { em: '1em' },
    },
    transitionProperty: {
      width: 'width',
      height: 'height',
    },
  },
  plugins: [require('@tailwindcss/typography'), require('daisyui')],
}
