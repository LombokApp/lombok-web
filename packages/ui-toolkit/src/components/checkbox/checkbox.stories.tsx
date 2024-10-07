import React from 'react'

import { Label } from '@/components/label'
import type { Meta, StoryObj } from '@storybook/react'

import { Checkbox } from './checkbox'

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Checkbox',
  component: Checkbox,
}

export default meta

type Story = StoryObj<typeof Checkbox>

export const Checked: Story = {
  args: {},
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
}
export const Unchecked: Story = {
  args: {},
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" checked={true} />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
}
