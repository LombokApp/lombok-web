import type { Meta, StoryObj } from '@storybook/react'

import { Slider } from '..'

const meta: Meta<typeof Slider> = {
  title: 'Components/Slider',
  component: Slider,
}

export default meta

type Story = StoryObj<typeof Slider>

export const BasicUsage: Story = {
  render: () => (
    <Slider defaultValue={[50]} max={100} step={1} className="w-[500px]" />
  ),
}
