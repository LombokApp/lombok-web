import type { Meta, StoryObj } from '@storybook/react'
import { SlidersHorizontal, SquareTerminal, Zap } from 'lucide-react'

import { DropdownMenuItem } from '../dropdown-menu/dropdown-menu'
import { SplitButton } from './split-button'

const meta: Meta<typeof SplitButton> = {
  title: 'Components/SplitButton',
  component: SplitButton,
}

export default meta

type Story = StoryObj<typeof SplitButton>

const menu = (
  <>
    <DropdownMenuItem
      icon={<Zap size={15} className="text-tone-blue" />}
      title="Start with defaults"
      description="Launch using all agent defaults"
    />
    <DropdownMenuItem
      icon={<SlidersHorizontal size={15} className="text-muted-foreground" />}
      title="Configure and start…"
      description="Override models and other settings"
    />
  </>
)

export const BasicUsage: Story = {
  render: () => (
    <SplitButton
      label="Chat"
      tone="blue"
      gradient
      icon={<SquareTerminal size={14} />}
      onPrimaryAction={() => undefined}
    >
      {menu}
    </SplitButton>
  ),
}

export const Tones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <SplitButton
        label="Chat"
        tone="blue"
        gradient
        onPrimaryAction={() => undefined}
      >
        {menu}
      </SplitButton>
      <SplitButton
        label="Code"
        tone="green"
        gradient
        onPrimaryAction={() => undefined}
      >
        {menu}
      </SplitButton>
      <SplitButton label="Run" tone="neutral" onPrimaryAction={() => undefined}>
        {menu}
      </SplitButton>
    </div>
  ),
}

/** With no primary action, the primary button opens the menu too. */
export const PrimaryOpensMenu: Story = {
  render: () => (
    <SplitButton label="Start" tone="blue" gradient onPrimaryAction={null}>
      {menu}
    </SplitButton>
  ),
}

export const Disabled: Story = {
  render: () => (
    <SplitButton
      label="Code"
      tone="green"
      gradient
      disabled
      onPrimaryAction={() => undefined}
    >
      {menu}
    </SplitButton>
  ),
}
