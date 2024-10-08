import React from 'react'

import type { Meta, StoryObj } from '@storybook/react'

import { DropdownMenu } from './dropdown-menu'

const meta: Meta<typeof DropdownMenu> = {
  title: 'Components/DropdownMenu',
  component: DropdownMenu,
}

export default meta

type Story = StoryObj<typeof DropdownMenu>

export const BasicUsage: Story = {
  args: {},
  render: (props) => <DropdownMenu {...props} />,
}
