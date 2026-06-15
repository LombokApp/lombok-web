import { cva } from 'class-variance-authority'

// `size` (default) is byte-identical to the previous fixed styling; `sm`/`lg` are additive.
export const textareaVariants = cva(
  'border-input bg-background ring-offset-background placeholder:text-muted-foreground ' +
    'focus-visible:ring-ring flex w-full rounded-md border focus-visible:outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'min-h-[60px] px-2.5 py-1.5 text-sm',
        default: 'min-h-[80px] px-3 py-2 text-sm',
        lg: 'min-h-[120px] px-4 py-3 text-base',
      },
    },
    defaultVariants: { size: 'default' },
  },
)
