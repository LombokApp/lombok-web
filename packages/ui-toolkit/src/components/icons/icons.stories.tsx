import React from 'react'

import type { Meta, StoryObj } from '@storybook/react'

import { Icons } from './icons'

const meta: Meta<typeof Icons> = {
  title: 'Components/Icons',
  component: Icons,
}

export default meta

type Story = StoryObj<typeof Icons>

export const BasicUsage: Story = {
  args: {},
  render: (props) => <Icons {...props} />,
}
