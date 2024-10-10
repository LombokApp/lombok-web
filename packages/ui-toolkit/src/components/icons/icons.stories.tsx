import React from 'react'

import type { Meta, StoryObj } from '@storybook/react'

import { Icons } from './icons'

const meta: Meta<typeof Icons.spinner> = {
  title: 'Components/Icons',
  component: Icons.spinner,
}

export default meta

type Story = StoryObj<typeof Icons>

export const BasicUsage: Story = {
  args: {},
  render: () => <Icons.spinner />,
}
