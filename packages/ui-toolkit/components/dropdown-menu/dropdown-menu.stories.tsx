import type { Meta, StoryObj } from '@storybook/react'
import { SlidersHorizontal, Zap } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '..'

const meta: Meta<typeof DropdownMenu> = {
  title: 'Components/DropdownMenu',
  component: DropdownMenu,
}

export default meta

type Story = StoryObj<typeof DropdownMenu>

export const BasicUsage: Story = {
  args: {},
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger>Open Dropdown</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Billing</DropdownMenuItem>
        <DropdownMenuItem>Team</DropdownMenuItem>
        <DropdownMenuItem>Subscription</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

/** Rich items: a leading icon plus a title and muted description line. */
export const RichItems: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger>Open Dropdown</DropdownMenuTrigger>
      <DropdownMenuContent className="w-[260px]">
        <DropdownMenuItem
          icon={<Zap size={15} className="text-tone-blue" />}
          title="Start with defaults"
          description="Launch using all agent defaults"
        />
        <DropdownMenuItem
          icon={
            <SlidersHorizontal size={15} className="text-muted-foreground" />
          }
          title="Configure and start…"
          description="Override models and other settings"
        />
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}
