import type { Meta, StoryObj } from '@storybook/react'
import { ArrowRight, Plus, Trash2 } from 'lucide-react'
import React from 'react'

import { Button } from './button'
import { ButtonSize, ButtonVariant } from './button.constants'

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

const VARIANTS = Object.values(ButtonVariant)
const SIZES = Object.values(ButtonSize)

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    controls: {
      exclude: ['className', 'style', 'asChild', 'leftIcon', 'rightIcon'],
    },
    docs: {
      description: {
        component:
          'Additive color model (UI_TOOLKIT_ALIGNMENT.md §4.6). Two axes: color ' +
          '(`tone` token or one-shot `color`) × style (`variant`: solid/soft/outline/' +
          'ghost/link + feature flag `gradient`). Every state derives from a single base ' +
          'via color-mix; solid fg uses contrast-color(). Toggle the toolbar theme for dark.',
      },
    },
  },
  argTypes: {
    children: { control: 'text' },
    tone: { options: TONES, control: 'select' },
    variant: { options: VARIANTS, control: 'select' },
    size: { options: SIZES, control: 'select' },
    color: { control: 'color' },
    gradient: { control: 'boolean' },
    dim: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
}

export default meta

type Story = StoryObj<typeof Button>

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center gap-3">{children}</div>
)

const Cell = ({ label }: { label: string }) => (
  <div className="text-muted-foreground w-20 shrink-0 text-xs">{label}</div>
)

/** Live-controlled playground. */
export const Playground: Story = {
  args: { children: 'Button', tone: 'blue', variant: 'solid' },
  render: (props) => <Button {...props} />,
}

/** The style axis (neutral tone). */
export const Variants: Story = {
  render: () => (
    <Row>
      {(['solid', 'soft', 'outline', 'ghost', 'link'] as const).map(
        (variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ),
      )}
    </Row>
  ),
}

/** The full color × style matrix — rows are tones, columns are derived variants. */
export const ToneMatrix: Story = {
  render: () => {
    const cols = ['solid', 'soft', 'outline', 'ghost', 'link'] as const
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Cell label="" />
          {cols.map((v) => (
            <div
              key={v}
              className="text-muted-foreground w-24 text-xs font-medium"
            >
              {v}
            </div>
          ))}
        </div>
        {TONES.map((tone) => (
          <div key={tone} className="flex items-center gap-3">
            <Cell label={tone} />
            {cols.map((variant) => (
              <div key={variant} className="w-24">
                <Button tone={tone} variant={variant} size="sm">
                  {tone}
                </Button>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  },
}

/** `gradient` feature flag — derived from the same base, solid only. */
export const Gradient: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Row>
        {TONES.map((tone) => (
          <Button key={tone} tone={tone} gradient>
            {tone}
          </Button>
        ))}
      </Row>
      <p className="text-muted-foreground text-xs">
        Same buttons without <code>gradient</code> for comparison:
      </p>
      <Row>
        {TONES.map((tone) => (
          <Button key={tone} tone={tone}>
            {tone}
          </Button>
        ))}
      </Row>
    </div>
  ),
}

/** `dim` feature flag — dimmed at rest, brightens to full on hover. Low-emphasis affordances. */
export const Dim: Story = {
  render: () => (
    <Row>
      {VARIANTS.map((variant) => (
        <Button key={variant} variant={variant} dim>
          {variant}
        </Button>
      ))}
    </Row>
  ),
}

/** Single-base override: any CSS `color` derives every state, no token needed. */
export const SingleBaseColor: Story = {
  render: () => {
    const colors = ['#7c3aed', '#0ea5e9', '#e11d48', '#16a34a', '#f59e0b']
    return (
      <div className="flex flex-col gap-3">
        {colors.map((color) => (
          <div key={color} className="flex items-center gap-3">
            <Cell label={color} />
            <Button color={color}>solid</Button>
            <Button color={color} variant="soft">
              soft
            </Button>
            <Button color={color} variant="outline">
              outline
            </Button>
            <Button color={color} variant="ghost">
              ghost
            </Button>
            <Button color={color} gradient>
              gradient
            </Button>
          </div>
        ))}
        <p className="text-muted-foreground text-xs">
          Light tones need an explicit <code>fg</code> (the contrast caveat,
          §4.6):
        </p>
        <Row>
          <Button color="#f59e0b">white fg (hard to read)</Button>
          <Button color="#f59e0b" fg="#1e1e1e">
            fg=&quot;#1e1e1e&quot;
          </Button>
        </Row>
      </div>
    )
  },
}

export const Sizes: Story = {
  render: () => (
    <Row>
      {(['xs', 'sm', 'default', 'lg'] as const).map((size) => (
        <Button key={size} tone="blue" size={size}>
          {size}
        </Button>
      ))}
      <Button tone="blue" size="icon" aria-label="add">
        <Plus className="size-4" />
      </Button>
    </Row>
  ),
}

export const Loading: Story = {
  render: () => (
    <Row>
      <Button loading>Saving…</Button>
      <Button tone="blue" loading>
        Connecting…
      </Button>
      <Button tone="green" variant="soft" loading>
        Running…
      </Button>
    </Row>
  ),
}

export const WithIcons: Story = {
  render: () => (
    <Row>
      <Button tone="blue" leftIcon={<Plus className="size-4" />}>
        New
      </Button>
      <Button
        tone="red"
        variant="soft"
        leftIcon={<Trash2 className="size-4" />}
      >
        Delete
      </Button>
      <Button variant="ghost" rightIcon={<ArrowRight className="size-4" />}>
        Continue
      </Button>
    </Row>
  ),
}

export const Disabled: Story = {
  render: () => (
    <Row>
      <Button disabled>solid</Button>
      <Button tone="blue" variant="soft" disabled>
        soft
      </Button>
      <Button tone="red" variant="outline" disabled>
        outline
      </Button>
    </Row>
  ),
}
