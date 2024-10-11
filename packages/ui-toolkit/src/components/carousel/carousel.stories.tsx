import React from 'react'

import type { Meta, StoryObj } from '@storybook/react'

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '..'

const meta: Meta<typeof Carousel> = {
  title: 'Components/Carousel',
  component: Carousel,
}

export default meta

type Story = StoryObj<typeof Carousel>

export const BasicUsage: Story = {
  args: {},
  render: () => (
    <Carousel>
      <CarouselContent>
        <CarouselItem>...</CarouselItem>
        <CarouselItem>...</CarouselItem>
        <CarouselItem>...</CarouselItem>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
}
