import clsx from 'clsx'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  elementSize?: 'sm' | 'md' | 'lg'
}

export function Input({
  error,
  className,
  type = 'text',
  autoComplete = undefined,
  id = undefined,
  label = undefined,
  name = undefined,
  value,
  elementSize = 'md',
  required = false,
  ...rest
}: InputProps) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={name}
        className="block text-sm leading-6 font-semibold text-gray-900 dark:text-white"
      >
        {label}
      </label>
      <div>
        <input
          id={id}
          value={value ?? ''}
          required={required}
          name={name}
          type={type}
          autoComplete={autoComplete}
          {...rest}
          className={clsx(
            elementSize === 'lg' && 'px-3 py-3',
            elementSize === 'md' && 'px-3 py-1.5',
            elementSize === 'sm' && 'px-3 py-0.5',
            'block w-full rounded-md border-0',
            'sm:text-sm sm:leading-6',
            'text-gray-900 placeholder:text-gray-400 shadow-sm ring-1 dark:ring-2 ring-inset ring-gray-300',
            'focus:ring-2 focus:ring-inset focus:ring-indigo-600 ',
            'dark:bg-transparent dark:text-white dark:ring-white/20 dark:focus:ring-indigo-500 outline-none',
            error && 'ring-red-500 dark:ring-red-500',
            className,
          )}
        />
      </div>
      {error && <div className="text-left text-xs text-red-500">{error}</div>}
    </div>
  )
}
