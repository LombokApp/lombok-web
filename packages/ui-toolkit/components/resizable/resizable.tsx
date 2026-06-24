import { GripVertical } from 'lucide-react'
import React from 'react'
import * as ResizablePrimitive from 'react-resizable-panels'

import { cn } from '../../utils'

// v4 dropped the data-panel-group-direction attribute; re-derive the styling
// signal from our own prop and thread it to the (sibling) handle via context.
const OrientationContext = React.createContext<'horizontal' | 'vertical'>(
  'horizontal',
)

const ResizablePanelGroup = ({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Group>) => (
  <OrientationContext.Provider value={orientation}>
    <ResizablePrimitive.Group
      orientation={orientation}
      data-orientation={orientation}
      className={cn(
        'flex size-full data-[orientation=vertical]:flex-col',
        className,
      )}
      {...props}
    />
  </OrientationContext.Provider>
)

const ResizablePanel = ResizablePrimitive.Panel

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
  withHandle?: boolean
}) => {
  const orientation = React.useContext(OrientationContext)
  return (
    <ResizablePrimitive.Separator
      data-orientation={orientation}
      className={cn(
        'bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full data-[orientation=vertical]:after:left-0 data-[orientation=vertical]:after:h-1 data-[orientation=vertical]:after:w-full data-[orientation=vertical]:after:-translate-y-1/2 data-[orientation=vertical]:after:translate-x-0 [&[data-orientation=vertical]>div]:rotate-90',
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-sm border">
          <GripVertical className="size-2.5" />
        </div>
      )}
    </ResizablePrimitive.Separator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
