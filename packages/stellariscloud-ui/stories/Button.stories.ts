import type { Meta, StoryObj } from '@storybook/react'

import { Button } from '../design-system/button/button'

// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
  title: 'Example/Button',
  component: Button,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/react/configure/story-layout
    layout: 'centered',
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/react/writing-docs/autodocs
  tags: ['autodocs'],
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    // backgroundColor: { control: 'color' },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

// More on writing stories with args: https://storybook.js.org/docs/react/writing-stories/args
export const Primary: Story = {
  args: {
    primary: true,
    children: 'Button',
  },
}

export const Secondary: Story = {
  args: {
    children: 'Button',
  },
}

export const Danger: Story = {
  args: {
    danger: true,
    children: 'Button',
  },
}

export const Link: Story = {
  args: {
    link: true,
    children: 'Button',
  },
}

export const ExtraLarge: Story = {
  args: {
    size: 'xl',
    children: 'Button',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Button',
  },
}

export const Medium: Story = {
  args: {
    size: 'md',
    children: 'Button',
  },
}

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Button',
  },
}

export const ExtraSmall: Story = {
  args: {
    size: 'xs',
    children: 'Button',
  },
}
