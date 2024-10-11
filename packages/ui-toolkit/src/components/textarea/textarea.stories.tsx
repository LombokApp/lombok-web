import React from 'react'

import type { Meta, StoryObj } from '@storybook/react'

import { Label, Textarea } from '..'

const meta: Meta<typeof Textarea> = {
  title: 'Components/Textarea',
  component: Textarea,
  argTypes: {
    placeholder: {
      description: 'Placeholder text for the textarea',
      control: 'text',
    },
    disabled: {
      description: 'Whether the textarea is disabled',
      control: 'boolean',
    },
  },
}

export default meta

type Story = StoryObj<typeof Textarea>

export const BasicUsage: Story = {
  args: {
    placeholder: 'Type your message here.',
    disabled: false,
  },
  render: (props) => (
    <div className="grid w-[400px] gap-1.5">
      <Label htmlFor="message">Your message</Label>
      <Textarea {...props} id="message" />
    </div>
  ),
}
