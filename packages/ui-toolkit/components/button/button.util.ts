// Additive color model: every state derives from --button-color via color-mix; tone is a static cva variant so it works through buttonVariants() (UI_TOOLKIT_ALIGNMENT.md §4.6).

import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex not-disabled:cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ' +
    'ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-[var(--button-color)] focus-visible:ring-offset-2 disabled:brightness-30',
  {
    variants: {
      variant: {
        solid:
          'shadow-sm bg-[var(--button-color)] text-[var(--button-fg,contrast-color(var(--button-color)))] ' +
          'not-disabled:hover:bg-[color-mix(in_oklab,var(--button-color)_88%,black)] ' +
          'not-disabled:active:bg-[color-mix(in_oklab,var(--button-color)_78%,black)]',
        soft:
          'bg-[color-mix(in_srgb,var(--button-color)_14%,transparent)] text-[var(--button-color)] ' +
          'not-disabled:hover:bg-[color-mix(in_srgb,var(--button-color)_22%,transparent)]',
        outline:
          // Colored tones tint the border toward --border; neutral uses --border directly (compound below).
          'border border-[color-mix(in_srgb,var(--button-color)_25%,var(--border))] text-[var(--button-color)] ' +
          'not-disabled:hover:bg-[color-mix(in_srgb,var(--button-color)_5%,transparent)]',
        ghost:
          'text-[var(--button-color)] not-disabled:hover:bg-[color-mix(in_srgb,var(--button-color)_10%,transparent)]',
        link: 'text-[var(--button-color)] underline-offset-4 not-disabled:hover:underline',
      },
      tone: {
        // Each tone sets --button-fg explicitly so solids don't depend on contrast-color(); neutral omits it (base --primary flips light/dark).
        neutral: '[--button-color:var(--primary)]',
        blue: '[--button-color:var(--color-tone-blue)] [--button-fg:#fff]',
        green: '[--button-color:var(--color-tone-green)] [--button-fg:#fff]',
        red: '[--button-color:var(--color-tone-red)] [--button-fg:#fff]',
        yellow:
          '[--button-color:var(--color-tone-yellow)] [--button-fg:#1c1917]',
        cyan: '[--button-color:var(--color-tone-cyan)] [--button-fg:#08272f]',
        orange:
          '[--button-color:var(--color-tone-orange)] [--button-fg:#1c1917]',
        fuchsia:
          '[--button-color:var(--color-tone-fuchsia)] [--button-fg:#fff]',
        purple: '[--button-color:var(--color-tone-purple)] [--button-fg:#fff]',
        danger: '[--button-color:var(--color-tone-danger)] [--button-fg:#fff]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        xs: 'h-7 rounded-md px-2.5 text-xs',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'size-10',
      },
      gradient: { true: '', false: '' },
      // Dimmed at rest, brightens on hover; `transition` (over base transition-colors) so brightness animates too.
      dim: {
        true: 'transition not-disabled:brightness-70 not-disabled:hover:brightness-100',
        false: '',
      },
    },
    compoundVariants: [
      // Neutral outline border = foreground at low opacity; % is the visibility knob (adapts to light/dark).
      {
        variant: 'outline',
        tone: 'neutral',
        class: 'border-[color-mix(in_srgb,var(--foreground)_12%,transparent)]',
      },
      {
        variant: 'solid',
        gradient: true,
        class:
          '[background-image:linear-gradient(180deg,var(--button-color),color-mix(in_oklab,var(--button-color)_78%,black))] ' +
          'not-disabled:hover:[background-image:linear-gradient(180deg,color-mix(in_oklab,var(--button-color)_88%,black),color-mix(in_oklab,var(--button-color)_70%,black))]',
      },
    ],
    defaultVariants: {
      variant: 'solid',
      tone: 'neutral',
      size: 'default',
      gradient: false,
      dim: false,
    },
  },
)
