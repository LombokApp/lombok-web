import type { Meta, StoryObj } from '@storybook/react'

import { Spinner } from './spinner'

const meta: Meta<typeof Spinner> = {
  title: 'Components/Spinner',
  component: Spinner,
  argTypes: {
    size: { control: 'number' },
  },
}

export default meta

type Story = StoryObj<typeof Spinner>

export const Playground: Story = {
  args: { size: 16 },
  render: (props) => <Spinner {...props} />,
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Spinner size={12} />
      <Spinner size={16} />
      <Spinner size={24} />
      <Spinner size={32} />
    </div>
  ),
}

/** Inherits `currentColor` — set via text color. */
export const Colors: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Spinner className="text-muted-foreground" />
      <Spinner className="text-primary" />
      <Spinner className="text-destructive" />
    </div>
  ),
}
