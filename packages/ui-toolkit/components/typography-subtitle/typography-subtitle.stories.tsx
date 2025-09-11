import type { Meta, StoryObj } from '@storybook/react'

import { TypographySubtitle } from './typography-subtitle'

const meta: Meta<typeof TypographySubtitle> = {
  title: 'Components/TypographySubTitle',
  component: TypographySubtitle,
}

export default meta

type Story = StoryObj<typeof TypographySubtitle>

export const BasicUsage: Story = {
  args: {},
  render: () => <TypographySubtitle>My Subtitle</TypographySubtitle>,
}
