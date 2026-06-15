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

export const Sizes: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-3">
      <Input size="sm" placeholder="sm" />
      <Input size="default" placeholder="default" />
      <Input size="lg" placeholder="lg" />
    </div>
  ),
}
