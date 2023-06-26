import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Fragment } from 'react'

import { IconButton } from '../button'
import { Heading } from '../typography'

export interface DrawerProps {
  /**
   * Boolean that controls whether or not the drawer is open. Don't conditionally render the <Drawer> component in your tree, that will break the animations.
   */
  isOpen: boolean
  /**
   * Callback that will be invoked when the drawer is closed.
   */
  onClose: () => void
  /**
   * Choose where the drawer comes from on the screen
   */
  from: 'left' | 'right' | 'bottom'
  /**
   * Contents of the drawer
   */
  children: ReactNode
  /**
   * Optional title that will be shown at the top of the contents.
   */
  title?: string
  /**
   * Optional decription
   */
  description?: string
  /**
   * Controls the maximum width of the modal. Only takes effect when `from` is "left" or "right"
   */
  size: 'sm' | 'md' | 'lg'
}

export function Drawer({
  isOpen,
  onClose,
  from,
  children,
  title,
  description,
  size,
}: DrawerProps) {
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="fixed inset-0 z-10 w-full h-full">
        <Transition.Child
          as={Fragment}
          enter="transition-opacity duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>
        <Transition.Child
          as={Fragment}
          enter="transition-transform duration-150"
          enterFrom={
            from === 'left'
              ? '-translate-x-full'
              : from === 'right'
              ? 'translate-x-full'
              : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              from === 'bottom'
              ? 'translate-y-full'
              : undefined
          }
          enterTo="transform-none"
          leave="transition-transform duration-150"
          leaveFrom="transform-none"
          leaveTo={
            from === 'left'
              ? '-translate-x-full'
              : from === 'right'
              ? 'translate-x-full'
              : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              from === 'bottom'
              ? 'translate-y-full'
              : undefined
          }
        >
          <div
            className={clsx(
              'bg-white dark:bg-purple-900 fixed shadow-lg p-6 md:p-12',
              from === 'left' && 'top-0 left-0 h-full',
              from === 'right' && 'top-0 right-0 h-full',
              from === 'bottom' && 'bottom-0 right-0 w-full',
              'w-full',
              size === 'sm' && from !== 'bottom'
                ? 'md:max-w-screen-sm'
                : size === 'md' && from !== 'bottom'
                ? 'md:max-w-screen-md'
                : size === 'lg' && from !== 'bottom'
                ? 'md:max-w-screen-lg'
                : null,
            )}
          >
            <IconButton
              title="Close this dialog"
              icon={XMarkIcon}
              variant="ghost"
              size="lg"
              onClick={onClose}
              className="absolute top-4 right-4 !p-0"
            />
            <div className="mb-6">
              {title && (
                <Dialog.Title as={Heading} level={2}>
                  {title}
                </Dialog.Title>
              )}
              {description && (
                <Dialog.Description>{description}</Dialog.Description>
              )}
            </div>
            {children}
          </div>
        </Transition.Child>
      </Dialog>
    </Transition>
  )
}
