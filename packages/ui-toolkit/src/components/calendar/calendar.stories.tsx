import React from 'react'

import type { Meta, StoryObj } from '@storybook/react'

import { Card } from '..'
import { Calendar } from './calendar'

const meta: Meta<typeof Calendar> = {
  title: 'Components/Calendar',
  component: Calendar,
  argTypes: {
    showOutsideDays: {
      description: 'Show Outside Days',
      table: {
        type: { summary: 'boolean' },
      },
      control: 'boolean',
    },
  },
}

export default meta

type Story = StoryObj<typeof Calendar>

export const BasicUsage: Story = {
  args: {},
  render: (props) => (
    <Card>
      <Calendar showOutsideDays={props.showOutsideDays} />
    </Card>
  ),
}
