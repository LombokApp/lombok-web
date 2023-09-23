import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid'
import clsx from 'clsx'
import React from 'react'

export function Select({
  label,
  value,
  onSelect,
  options,
  emptyLabel,
  disabledLabel = '...',
  disabled = false,
}: {
  label?: string
  value?: { name: string; id: string }
  options: { name: string; id: string }[]
  onSelect: (value: { name: string; id: string }) => void
  emptyLabel: string
  disabledLabel?: string
  disabled?: boolean
}) {
  return (
    <Listbox value={value} onChange={onSelect}>
      {({ open }) => (
        <>
          {label && (
            <Listbox.Label className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">
              {label}
            </Listbox.Label>
          )}
          <div className="relative mt-2">
            <Listbox.Button
              aria-disabled={disabled}
              className="relative w-full cursor-default rounded-md bg-white dark:bg-white/5 py-1.5 pl-3 pr-10 text-left text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 outline-none dark:ring-white/10 dark:focus:ring-indigo-500"
            >
              <span className="block truncate">
                {disabled ? (
                  <span className="italic">{disabledLabel}</span>
                ) : (
                  value?.name ?? emptyLabel
                )}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon
                  className="h-5 w-5 text-gray-400 dark:text-white"
                  aria-hidden="true"
                />
              </span>
            </Listbox.Button>

            {!disabled && (
              <Transition
                show={open}
                as={React.Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-900 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {options.map((option) => (
                    <Listbox.Option
                      key={option.id}
                      className={({ active }) =>
                        clsx(
                          active
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-900 dark:text-white',
                          'relative cursor-default select-none py-2 pl-3 pr-9',
                        )
                      }
                      value={option}
                    >
                      {(optionProps) => (
                        <>
                          <span
                            className={clsx(
                              optionProps.selected
                                ? 'font-semibold'
                                : 'font-normal',
                              'block truncate',
                            )}
                          >
                            {option.name}
                          </span>

                          {optionProps.selected ? (
                            <span
                              className={clsx(
                                optionProps.active
                                  ? 'text-white'
                                  : 'text-indigo-600',
                                'absolute inset-y-0 right-0 flex items-center pr-4',
                              )}
                            >
                              <CheckIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            )}
          </div>
        </>
      )}
    </Listbox>
  )
}
