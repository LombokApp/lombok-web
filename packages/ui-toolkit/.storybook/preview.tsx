import type { Preview } from '@storybook/react'
import './global.css'
import React from 'react'

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'Light Mode',
      toolbar: {
        icon: 'sun',
        items: ['Light Mode', 'Dark Mode'],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const dark = context.globals.theme === 'Dark Mode'
      // Token swap is keyed off the root; mirror it on body so the canvas (which Storybook
      // owns) repaints too, and wrap the story in a themed, padded surface.
      const root = document.documentElement
      const body = document.body
      if (dark) {
        root.setAttribute('data-mode', 'dark')
        body.setAttribute('data-mode', 'dark')
      } else {
        root.removeAttribute('data-mode')
        body.removeAttribute('data-mode')
      }

      return (
        <div className="bg-background text-foreground min-h-screen p-6">
          <Story />
        </div>
      )
    },
  ],
}

export default preview

export const decorators = []
