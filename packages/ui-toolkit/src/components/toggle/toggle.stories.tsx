import type { Meta, StoryObj } from '@storybook/react'
import { Bold } from 'lucide-react'
import React from 'react'

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
      <Bold className="size-4" />
    </Toggle>
  ),
}
