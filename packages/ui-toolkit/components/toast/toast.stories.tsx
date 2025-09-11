import type { Meta, StoryObj } from '@storybook/react'

import { useToast } from '../../hooks'
import { Button, Toast, ToastAction, Toaster } from '..'

const meta: Meta<typeof Toast> = {
  title: 'Components/Toast',
  component: Toast,
}

export default meta

type Story = StoryObj<typeof Toast>

const BasicUsageExample = () => {
  const { toast } = useToast()

  return (
    <div className="flex h-[200px] w-[400px] flex-col items-center justify-center">
      <Toaster />
      <Button
        variant="outline"
        onClick={() =>
          toast({
            description: 'Your message has been sent.',
          })
        }
      >
        Launch toast
      </Button>
    </div>
  )
}

export const BasicUsage: Story = {
  render: () => <BasicUsageExample />,
}

const WithTitleExample = () => {
  const { toast } = useToast()

  return (
    <div className="flex h-[200px] w-[400px] flex-col items-center justify-center">
      <Toaster />
      <Button
        variant="outline"
        onClick={() =>
          toast({
            title: 'Uh oh! Something went wrong.',
            description: 'There was a problem with your request.',
          })
        }
      >
        Launch toast
      </Button>
    </div>
  )
}

export const WithTitle: Story = {
  render: () => <WithTitleExample />,
}

const WithActionExample = () => {
  const { toast } = useToast()

  return (
    <div className="flex h-[200px] w-[400px] flex-col items-center justify-center">
      <Toaster />
      <Button
        variant="outline"
        onClick={() =>
          toast({
            title: 'Scheduled: Catch up',
            description: 'Friday, February 10, 2023 at 5:57 PM',
            action: (
              <ToastAction altText="Goto schedule to undo">Undo</ToastAction>
            ),
          })
        }
      >
        Launch toast
      </Button>
    </div>
  )
}
export const WithAction: Story = {
  render: () => <WithActionExample />,
}

const DestructiveExample = () => {
  const { toast } = useToast()

  return (
    <div className="flex h-[200px] w-[400px] flex-col items-center justify-center">
      <Toaster />
      <Button
        variant="outline"
        onClick={() =>
          toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: 'There was a problem with your request.',
            action: <ToastAction altText="Try again">Try again</ToastAction>,
          })
        }
      >
        Launch toast
      </Button>
    </div>
  )
}
export const Destructive: Story = {
  render: () => <DestructiveExample />,
}
