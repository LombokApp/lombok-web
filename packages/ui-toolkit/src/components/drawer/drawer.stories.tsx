import React from 'react'

import type { Meta, StoryObj } from '@storybook/react'

import {
  Button,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '..'

const meta: Meta<typeof Drawer> = {
  title: 'Components/Drawer',
  component: Drawer,
}

export default meta

type Story = StoryObj<typeof Drawer>

export const BasicUsage: Story = {
  args: {},
  render: () => (
    <Drawer>
      <DrawerTrigger>Open drawer</DrawerTrigger>
      <DrawerContent className="max-w-[30em] mx-auto">
        <DrawerHeader>
          <DrawerTitle>Are you absolutely sure?</DrawerTitle>
          <DrawerDescription>This action cannot be undone.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button>Submit</Button>
          <DrawerClose>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
}
