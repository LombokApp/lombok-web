import React from 'react'

import type { Meta, StoryObj } from '@storybook/react'
import { AlertCircle, Terminal } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from './alert'

const meta: Meta<typeof Alert> = {
  title: 'Components/Alert',
  component: Alert,
}

export default meta

type Story = StoryObj<typeof Alert>

export const DefaultVariantNoIcon: Story = {
  args: {},
  render: () => <Alert>Click me</Alert>,
}

export const DefaultVariantWithIcon: Story = {
  args: {},
  render: () => (
    <Alert>
      <Terminal className="h-4 w-4" />
      <AlertTitle>Important Information</AlertTitle>
      <AlertDescription>
        This is an important informational message
      </AlertDescription>
    </Alert>
  ),
}

export const DestructiveVariant: Story = {
  args: {},
  render: () => (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>You have been logged out.</AlertDescription>
    </Alert>
  ),
}
