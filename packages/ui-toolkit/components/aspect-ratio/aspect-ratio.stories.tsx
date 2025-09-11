import type { Meta, StoryObj } from '@storybook/react'

import { AspectRatio } from '..'

const meta: Meta<typeof AspectRatio> = {
  title: 'Components/AspectRatio',
  component: AspectRatio,
  argTypes: {
    ratio: {
      name: 'Aspect Ratio',
      description: 'Aspect Ratio',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '2' },
      },
      control: { type: 'number', min: 0 },
    },
  },
}

export default meta

type Story = StoryObj<typeof AspectRatio>

export const BasicUsage: Story = {
  args: {},
  render: ({ ratio = 2 }) => (
    <div className="w-[450px]">
      <AspectRatio ratio={ratio} className="bg-red-500" />
    </div>
  ),
}
