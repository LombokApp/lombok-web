import clsx from 'clsx'
import type { ForwardedRef, InputHTMLAttributes } from 'react'
import { forwardRef } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * Label text that will appear to the left of the input. This must be provided even if you wish to visually hide the label.
   */
  label?: string
  /**
   * Visually hides the label, but still makes it available to screen readers.
   */
  hideLabel?: boolean
  /**
   * Is Input in error state
   */
  isError?: boolean
  disabled?: boolean
  /**
   * Class that will go directly on the <input> element instead of its wrapper
   */
  inputClassName?: string

  componentSize?: 'sm' | 'md' | 'lg'
}

export const Input = forwardRef(function Input(
  {
    label,
    hideLabel = false,
    type = 'text',
    disabled = false,
    className,
    inputClassName,
    isError,
    componentSize,
    ...rest
  }: InputProps,
  ref: ForwardedRef<HTMLInputElement>,
) {
  return (
    <div className={clsx('flex flex-col rounded-xl', className)}>
      {label && (
        <span
          className={clsx(
            'flex',
            hideLabel ? 'sr-only' : null,
            isError && 'text-red-500',
            'font-semibold tracking-widest',
            componentSize === 'sm' ? 'text-sm' : '',
          )}
        >
          {label}
        </span>
      )}

      <div className={clsx('flex')}>
        <input
          className={clsx(
            'input',
            'w-full xs:max-w-xs',
            isError && 'input-error',
            inputClassName,
            componentSize === 'sm' ? 'text-sm' : 'text-lg',
          )}
          ref={ref}
          type={type}
          disabled={disabled}
          {...rest}
        />
      </div>
    </div>
  )
})
