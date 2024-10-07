import React from 'react'

import { Checkbox } from '@/components/checkbox'
import type { Meta, StoryObj } from '@storybook/react'

import { Label } from './label'

const meta: Meta<typeof Label> = {
  title: 'Components/Label',
  component: Label,
}

export default meta

type Story = StoryObj<typeof Label>

export const BasicUsage: Story = {
  args: {},
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
}
