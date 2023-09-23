import { Transition } from '@headlessui/react'
import React from 'react'
import ReactDOM from 'react-dom'

export const Takeover: (children: {
  children: React.ReactNode
}) => React.ReactPortal = ({ children }: { children: React.ReactNode }) => {
  return ReactDOM.createPortal(
    <Transition.Root show={true} as={React.Fragment}>
      <div className="absolute inset-0 z-10 h-screen w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            {children}
          </Transition.Child>
        </div>
      </div>
    </Transition.Root>,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    document.querySelector('#takeover-root')!,
  )
}
