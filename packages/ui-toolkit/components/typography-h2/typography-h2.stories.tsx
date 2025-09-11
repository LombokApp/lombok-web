import type { Meta, StoryObj } from '@storybook/react'

import { Card, CardContent } from '../card'
import { TypographyH2 } from './typography-h2'

const meta: Meta<typeof TypographyH2> = {
  title: 'Components/TypographyH2',
  component: TypographyH2,
}

export default meta

type Story = StoryObj<typeof TypographyH2>

export const BasicUsage: Story = {
  args: {},
  render: () => (
    <Card>
      <CardContent className="p-10">
        <TypographyH2>My H2 Title</TypographyH2>
      </CardContent>
    </Card>
  ),
}
