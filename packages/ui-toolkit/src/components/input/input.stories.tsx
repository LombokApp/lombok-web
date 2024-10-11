import React from 'react'

import type { Meta, StoryObj } from '@storybook/react'

import { Card, CardContent, CardHeader, CardTitle, Input, Label } from '..'

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  argTypes: {
    value: {
      description: 'Input text value',
      table: {
        type: { summary: 'string' },
      },
      control: 'text',
    },
    placeholder: {
      description: 'Input placeholder value',
      table: {
        type: { summary: 'string' },
      },
      control: 'text',
    },
  },
}

export default meta

type Story = StoryObj<typeof Input>

export const BasicUsage: Story = {
  args: {},
  render: (props) => (
    <Card>
      <CardHeader>
        <CardTitle>
          <Label htmlFor="myfield">Your Input</Label>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Input
          id="myfield"
          value={props.value}
          placeholder={props.placeholder}
        />
      </CardContent>
    </Card>
  ),
}
