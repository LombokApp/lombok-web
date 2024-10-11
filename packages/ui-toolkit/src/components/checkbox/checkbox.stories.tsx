import React from 'react'

import type { Meta, StoryObj } from '@storybook/react'

import { Label } from '..'
import { Checkbox } from './checkbox'

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Checkbox',
  component: Checkbox,
  argTypes: {
    checked: {
      description: 'Checked state',
      table: {
        type: { summary: 'boolean' },
      },
      control: 'boolean',
    },
  },
}

export default meta

type Story = StoryObj<typeof Checkbox>

export const BasicUsage: Story = {
  args: {},
  render: (props) => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" checked={props.checked} />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
}
