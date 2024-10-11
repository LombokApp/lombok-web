import React from 'react'

import type { Meta, StoryObj } from '@storybook/react'
import { Bold } from 'lucide-react'

import { Toggle } from '..'

const meta: Meta<typeof Toggle> = {
  title: 'Components/Toggle',
  component: Toggle,
}

export default meta

type Story = StoryObj<typeof Toggle>

export const BasicUsage: Story = {
  args: {},
  render: () => (
    <Toggle aria-label="Toggle bold">
      <Bold className="h-4 w-4" />
    </Toggle>
  ),
}
