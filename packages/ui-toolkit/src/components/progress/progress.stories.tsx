import React from 'react'

import type { Meta, StoryObj } from '@storybook/react'

import { Progress } from '..'

const meta: Meta<typeof Progress> = {
  title: 'Components/Progress',
  component: Progress,
}

export default meta

type Story = StoryObj<typeof Progress>

export const BasicUsage: Story = {
  args: {},
  decorators: [(Story) => <Story />],
  render: () => {
    const [progress, setProgress] = React.useState(13)

    React.useEffect(() => {
      const timer = setTimeout(() => setProgress(66), 500)
      return () => clearTimeout(timer)
    }, [])

    return <Progress value={progress} className="w-[400px]" />
  },
}
