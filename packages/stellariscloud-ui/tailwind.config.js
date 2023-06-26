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
  daisyui: {
    themes: [
      {
        synthwave: {
          ...require('daisyui/src/colors/themes')['[data-theme=synthwave]'],
          primary: '#543be3',
          'primary-focus': '#4c32e2',
          // 'primary-hover': '#278240',
          // primary: '#32a852',
          // 'primary-content': '#ffffff',
          // 'primary-focus': '#278240',
          secondary: '#6d28d9',
          // 'secondary-content': '#ffffff',
          // accent: '#075985',
          // 'accent-content': '#ffffff',
          // neutral: '#3d4451',
          // 'neutral-content': '#ffffff',
          // 'base-100': '#ffffff',
          // info: '#3ABFF8',
          // success: '#36D399',
          // warning: '#FBBD23',
          // error: '#F87272',
        },
      },
    ],
  },
}
