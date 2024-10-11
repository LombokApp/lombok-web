import React from 'react'

import type { Meta, StoryObj } from '@storybook/react'

import { TypographyH1 } from './typography-h1'

const meta: Meta<typeof TypographyH1> = {
  title: 'Components/TypographyH1',
  component: TypographyH1,
}

export default meta

type Story = StoryObj<typeof TypographyH1>

export const BasicUsage: Story = {
  args: {},
  render: () => <TypographyH1>My Title</TypographyH1>,
}
