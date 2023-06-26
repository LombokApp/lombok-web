import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Fragment } from 'react'

import { IconButton } from '../button'
import { Heading } from '../typography'

export interface ModalProps {
  /**
   * Boolean that controls whether or not the modal is open. Don't conditionally render the <Modal> component in your tree, that will break the animations.
   */
  isOpen: boolean
  /**
   * Callback that will be invoked when the drawer is closed. Leave this undefined if you wish to prevent the modal from being dismissed automatically.
   */
  onClose?: () => void
  /**
   * Contents of the modal
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
   * Controls the maximum width of the modal.
   */
  size?: 'sm' | 'md' | 'lg'
}

const noop = () => null

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = 'md',
}: ModalProps) {
  return (
    <Transition show={isOpen} appear as={Fragment}>
      <Dialog
        onClose={onClose ? onClose : noop}
        className="fixed inset-0 z-10 flex items-center justify-center w-full h-full"
      >
        <Transition.Child
          as={Fragment}
          enter="transition-opacity duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-2xl" />
        </Transition.Child>
        <Transition.Child
          as={Fragment}
          enter="transition-transform duration-150"
          enterFrom="scale-95 opacity-0"
          enterTo="scale-100 opacity-100"
          leave="transition-transform duration-150"
          leaveFrom="scale-100 opacity-100"
          leaveTo="scale-95 opacity-0"
        >
          <div
            className={clsx(
              'relative shadow-lg p-6 md:p-12 w-full rounded-2xl',
              size === 'sm'
                ? 'md:max-w-screen-sm'
                : size === 'md'
                ? 'md:max-w-screen-md'
                : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                size === 'lg'
                ? 'md:max-w-screen-lg'
                : null,
            )}
            style={{ backgroundColor: 'rgb(241 248 249)' }}
          >
            {onClose ? (
              <IconButton
                title="Close this dialog"
                icon={XMarkIcon}
                variant="ghost"
                size="lg"
                onClick={onClose}
                className="absolute top-4 right-4 !p-0"
              />
            ) : null}
            <div className="mb-6">
              {title && (
                <Dialog.Title
                  as={Heading}
                  level={2}
                  customSize
                  className="text-4xl text-center"
                >
                  {title}
                </Dialog.Title>
              )}
              {description && (
                <Dialog.Description>{description}</Dialog.Description>
              )}
            </div>

            <div className="overflow-auto max-h-[80vh]">
              <div className="px-6 py-1">{children}</div>
            </div>
          </div>
        </Transition.Child>
      </Dialog>
    </Transition>
  )
}
