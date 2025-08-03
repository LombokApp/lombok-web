import type { Meta, StoryObj } from '@storybook/react'

import { Badge, BadgeVariant } from '..'

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  argTypes: {
    variant: {
      description: 'Variant of badge',
      options: Object.values(BadgeVariant),
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: BadgeVariant.default },
      },
      control: 'select',
    },
  },
}

export default meta

type Story = StoryObj<typeof Badge>

export const BasicUsage: Story = {
  args: {},
  render: ({ variant = 'default' }) => (
    <Badge variant={variant}>{variant}</Badge>
  ),
}
