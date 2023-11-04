import type { Preview } from '@storybook/react'

import '../styles/common-base-styles.css'
import '../styles/globals.css'
import '../fonts/inter/inter.css'

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
