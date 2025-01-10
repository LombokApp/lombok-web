import type { Meta, StoryObj } from '@storybook/react'

import { TypographyH3 } from './typography-h3'

const meta: Meta<typeof TypographyH3> = {
  title: 'Components/TypographyH3',
  component: TypographyH3,
}

export default meta

type Story = StoryObj<typeof TypographyH3>

export const BasicUsage: Story = {
  args: {},
  render: () => <TypographyH3>My H3 Title</TypographyH3>,
}
