'use client'

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import * as React from 'react'

import { cn } from '../../utils'

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        'flex touch-none transition-colors select-none px-1 box-content',
        orientation === 'vertical' &&
          'h-full w-2 border-l border-l-transparent',
        orientation === 'horizontal' &&
          'h-2.5 flex-col border-t border-t-transparent',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1 rounded-full bg-foreground/20"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

function ScrollArea({
  className,
  children,
  type = 'always',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn('pr-4 w-[calc(100%+1rem)]', 'min-h-0', className)}
      type={type}
      {...props}
    >
      <div className="relative h-full min-w-fit">
        <ScrollAreaPrimitive.Viewport
          data-slot="scroll-area-viewport"
          className={cn(
            'size-full rounded-[inherit] outline-none',
            'transition-[color,box-shadow]',
            'focus-visible:outline-1 focus-visible:ring focus-visible:ring-ring/50',
          )}
        >
          {children}
        </ScrollAreaPrimitive.Viewport>
      </div>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

export { ScrollArea, ScrollBar }
