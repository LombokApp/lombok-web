import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'

import { Label, Switch } from '..'

const meta: Meta<typeof Switch> = {
  title: 'Components/Switch',
  component: Switch,
}

export default meta

type Story = StoryObj<typeof Switch>

export const BasicUsage: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode">Airplane Mode</Label>
    </div>
  ),
}
