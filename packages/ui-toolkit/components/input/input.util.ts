import { cva } from 'class-variance-authority'

// `size` (default) is byte-identical to the previous fixed styling; `sm`/`lg` are additive.
// Native numeric `size` is omitted (unused across the codebase) so `size` can be the variant.
export const inputVariants = cva(
  'flex w-full rounded-md border border-input bg-background shadow-sm transition-colors ' +
    'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground ' +
    'text-fg-subtle placeholder:text-fg-faint focus-visible:outline-none focus-visible:ring-1 ' +
    'focus-visible:ring-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'h-8 px-2.5 py-1 text-sm',
        default: 'h-9 px-3 py-1 text-base md:text-sm',
        lg: 'h-11 px-4 py-2 text-base',
      },
    },
    defaultVariants: { size: 'default' },
  },
)
