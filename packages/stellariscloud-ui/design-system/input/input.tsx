import clsx from 'clsx'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({
  className,
  type = 'text',
  autoComplete = undefined,
  id = undefined,
  label = undefined,
  name = undefined,
  required = false,
  ...rest
}: InputProps) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={name}
        className="block text-sm font-medium leading-6 text-gray-900 dark:text-white"
      >
        {label}
      </label>
      <input
        id={id}
        required={required}
        name={name}
        type={type}
        autoComplete={autoComplete}
        {...rest}
        className={clsx(
          'block w-full rounded-md border-0 px-3 py-1.5',
          'sm:text-sm sm:leading-6',
          'text-gray-900 placeholder:text-gray-400 shadow-sm ring-1 ring-inset ring-gray-300',
          'focus:ring-2 focus:ring-inset focus:ring-indigo-600 ',
          'dark:bg-white/5 dark:text-white dark:ring-white/10 dark:focus:ring-indigo-500 outline-none',
          className,
        )}
      />
    </div>
  )
}
