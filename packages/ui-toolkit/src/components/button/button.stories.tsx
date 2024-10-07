import React from 'react'

import type { Meta, StoryObj } from '@storybook/react'

import { Button, ButtonSize, ButtonVariant } from './button'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    controls: {
      exclude: ['className', 'style', 'asChild'],
    },
  },
  argTypes: {
    children: {
      description: 'Button label',
      table: {
        type: { summary: 'string' },
      },
      control: 'text',
    },
    variant: {
      description: 'Variant of button',
      options: Object.values(ButtonVariant),
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: ButtonVariant.default },
      },
      control: 'select',
    },
    size: {
      description: 'Size of button',
      options: Object.values(ButtonSize),
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: ButtonSize.default },
      },
      control: 'select',
    },
  },
}

export default meta

type Story = StoryObj<typeof Button>

export const BasicUsage: Story = {
  args: {
    children: 'Click me',
  },
  render: (props) => <Button {...props} />,
}
