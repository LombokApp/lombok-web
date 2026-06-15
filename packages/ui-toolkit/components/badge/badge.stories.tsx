import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'

import { Badge, BadgeVariant } from '..'

const TONES = [
  'neutral',
  'blue',
  'green',
  'red',
  'yellow',
  'cyan',
  'orange',
  'danger',
] as const

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  parameters: {
    docs: {
      description: {
        component:
          'Additive color model (UI_TOOLKIT_ALIGNMENT.md §4.6) — `tone`/`color` + ' +
          '`solid`/`soft` variants + `size`. Legacy variants unchanged without a tone.',
      },
    },
  },
  argTypes: {
    variant: {
      options: Object.values(BadgeVariant),
      control: 'select',
    },
    tone: { options: TONES, control: 'select' },
    size: { options: ['default', 'sm'], control: 'select' },
    color: { control: 'color' },
  },
}

export default meta

type Story = StoryObj<typeof Badge>

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center gap-2">{children}</div>
)

export const Playground: Story = {
  args: { children: 'Badge', tone: 'blue', variant: 'soft' },
  render: (props) => <Badge {...props} />,
}

/** The style axis (neutral tone). */
export const Variants: Story = {
  render: () => (
    <Row>
      {(['solid', 'soft', 'outline'] as const).map((variant) => (
        <Badge key={variant} variant={variant}>
          {variant}
        </Badge>
      ))}
    </Row>
  ),
}

/** Tones across the derived variants. */
export const Tones: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      {(['solid', 'soft', 'outline'] as const).map((variant) => (
        <Row key={variant}>
          {TONES.map((tone) => (
            <Badge key={tone} tone={tone} variant={variant}>
              {tone}
            </Badge>
          ))}
        </Row>
      ))}
    </div>
  ),
}

/** Compact `size="sm"` for count/status pills. */
export const Sizes: Story = {
  render: () => (
    <Row>
      <Badge tone="blue" variant="soft" size="sm">
        12
      </Badge>
      <Badge tone="green" variant="soft" size="sm">
        active
      </Badge>
      <Badge tone="blue" variant="soft">
        12
      </Badge>
      <Badge tone="green" variant="soft">
        active
      </Badge>
    </Row>
  ),
}
