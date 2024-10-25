import React from 'react'

import type { Meta, StoryObj } from '@storybook/react'

import { Button } from '../button/button'
import { ButtonGroup } from './button-group'

const meta: Meta<typeof ButtonGroup> = {
  title: 'Components/ButtonGroup',
  component: ButtonGroup,
}

export default meta

type Story = StoryObj<typeof ButtonGroup>

export const BasicUsage: Story = {
  args: {},
  render: (props) => (
    <ButtonGroup {...props}>
      <Button>Action 1</Button>
      <Button>Action 2</Button>
      <Button>Action 3</Button>
    </ButtonGroup>
  ),
}
