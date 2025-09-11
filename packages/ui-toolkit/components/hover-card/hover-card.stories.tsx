import type { Meta, StoryObj } from '@storybook/react'

import { HoverCard, HoverCardContent, HoverCardTrigger } from '..'

const meta: Meta<typeof HoverCard> = {
  title: 'Components/HoverCard',
  component: HoverCard,
}

export default meta

type Story = StoryObj<typeof HoverCard>

export const BasicUsage: Story = {
  args: {},
  render: () => (
    <div className="min-h-80">
      <HoverCard>
        <HoverCardTrigger>Hover</HoverCardTrigger>
        <HoverCardContent>
          The React Framework – created and maintained by @vercel.
        </HoverCardContent>
      </HoverCard>
    </div>
  ),
}
