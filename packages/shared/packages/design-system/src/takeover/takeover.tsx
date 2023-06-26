import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import type { MutableRefObject, ReactNode } from 'react'
import { Fragment, useEffect, useState } from 'react'

import { IconButton } from '../button'

export interface TakeoverProps {
  /**
   * Boolean that controls whether or not the drawer is open. Don't conditionally render the <Drawer> component in your tree, that will break the animations.
   */
  isOpen: boolean
  /**
   * Callback that will be invoked when the drawer is closed.
   */
  onClose: () => void
  /**
   * Contents of the drawer
   */
  children: ReactNode
  /**
   * className for the top-level wrapper
   */
  className?: string
  /**
   * ref to the element that triggered this opening. Used to calculate the origin point of the animation
   */
  triggerRef: MutableRefObject<HTMLElement | undefined>
}

export function Takeover({
  isOpen,
  onClose,
  children,
  className,
  triggerRef,
}: TakeoverProps) {
  const [clipPath, setClipPath] = useState<string>()
  const updateClipPath = (isOpening: boolean) => {
    if (triggerRef.current) {
      const bcr = triggerRef.current.getBoundingClientRect()
      const xOrigin = (bcr.left + bcr.right) / 2
      const yOrigin = (bcr.top + bcr.bottom) / 2
      setClipPath(
        `circle(${isOpening ? '200%' : '0%'} at ${xOrigin}px ${yOrigin}px)`,
      )
    }
  }

  // initializes the clip path so the first animation will work
  useEffect(() => {
    updateClipPath(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Transition
      as={Fragment}
      show={isOpen}
      enter="transition-all duration-500"
      leave="transition-all duration-500"
      beforeEnter={() => updateClipPath(true)}
      beforeLeave={() => updateClipPath(false)}
    >
      <Dialog
        onClose={onClose}
        className={clsx(className, 'fixed inset-0 z-10 w-full h-full')}
        style={{ clipPath }}
      >
        <IconButton
          title="Close this dialog"
          icon={XMarkIcon}
          variant="ghost"
          size="lg"
          onClick={onClose}
          className="absolute top-6 right-6 !p-0"
        />
        {children}
      </Dialog>
    </Transition>
  )
}
