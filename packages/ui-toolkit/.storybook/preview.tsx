import type { Preview } from '@storybook/react'
import './global.css'
import React from 'react'

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      toolbar: {
        icon: 'sun',
        items: ['Light Mode', 'Dark Mode'],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      if (context.globals.theme === 'Dark Mode') {
        document.documentElement.setAttribute('data-mode', 'dark')
      } else {
        document.documentElement.removeAttribute('data-mode')
      }

      return <Story />
    },
  ],
}

export default preview

export const decorators = []
