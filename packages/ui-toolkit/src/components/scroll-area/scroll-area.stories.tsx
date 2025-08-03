import type { Meta, StoryObj } from '@storybook/react'

import { ScrollArea, Separator } from '..'

const meta: Meta<typeof ScrollArea> = {
  title: 'Components/ScrollArea',
  component: ScrollArea,
}

export default meta

type Story = StoryObj<typeof ScrollArea>

export const BasicUsage: Story = {
  args: {},
  render: () => {
    const tags = [
      'v1.2.0-beta.1',
      'v1.2.0-beta.2',
      'v1.2.0-beta.3',
      'v1.2.0-beta.4',
      'v1.2.0-beta.5',
      'v1.2.0-beta.6',
      'v1.2.0-beta.7',
      'v1.2.0-beta.8',
      'v1.2.0-beta.9',
      'v1.2.0-beta.10',
    ]
    return (
      <ScrollArea className="h-72 w-48 rounded-md border">
        <div className="p-4">
          <h4 className="mb-4 text-sm font-medium leading-none">Tags</h4>
          {tags.map((tag) => (
            <>
              <div key={tag} className="text-sm">
                {tag}
              </div>
              <Separator className="my-2" />
            </>
          ))}
        </div>
      </ScrollArea>
    )
  },
}
