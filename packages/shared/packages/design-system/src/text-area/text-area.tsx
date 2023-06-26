import clsx from 'clsx'
import type { ForwardedRef, TextareaHTMLAttributes } from 'react'
import { forwardRef } from 'react'

import { HelperText } from '../typography'

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Label text that will appear to the left of the input. This must be provided even if you wish to visually hide the label.
   */
  label: string
  /**
   * Visually hides the label, but still makes it available to screen readers.
   */
  hideLabel?: boolean
  /**
   * Align text content to the right of the input instead.
   */
  alignRight?: boolean
  /**
   * Error message that replaces the `helperText` when supplied
   */
  errorMessage?: string
  /**
   * Helper text that will appear underneath the user input
   */
  helperText?: string
  disabled?: boolean
  /**
   * Class that will go directly on the <input> element instead of its wrapper
   */
  inputClassName?: string
}

export const TextArea = forwardRef(function Textarea(
  {
    label,
    alignRight = false,
    hideLabel = false,
    errorMessage,
    disabled = false,
    helperText,
    className,
    inputClassName,
    ...rest
  }: TextareaProps,
  ref: ForwardedRef<HTMLTextAreaElement>,
) {
  const isError = !!errorMessage
  return (
    <div className={className}>
      <span
        className={clsx(
          hideLabel ? 'sr-only' : null,
          isError && 'text-red-500',
          'uppercase font-semibold tracking-widest self-center',
        )}
      >
        {label}
      </span>
      <div
        className={clsx(
          'border-t border-r border-b-2 border-[#E5E5E5] bg-white',
          className,
        )}
      >
        <div
          className={clsx(
            'bg-white border-accent border-l-[6px] flex focus-within:border-black',
            alignRight ? 'w-full' : null,
          )}
        >
          <textarea
            className={clsx(
              'w-full text-lg p-4 bg-transparent focus:ring-0 focus:outline-none placeholder-shown:uppercase placeholder-shown:tracking-widest placeholder-shown:font-semibold placeholder-current/40',
              alignRight ? 'text-right' : 'text-left',
              inputClassName,
            )}
            ref={ref}
            disabled={disabled}
            {...rest}
          />
        </div>
      </div>
      {(helperText || isError) && (
        <HelperText
          className={clsx('mt-1 font-semibold text-left text-red-500')}
          isError={isError}
        >
          {isError ? errorMessage : helperText}
        </HelperText>
      )}
    </div>
  )
})
