/*
 * Button — additive color model (UI_TOOLKIT_ALIGNMENT.md §4.6). Two orthogonal axes:
 *   • color : `tone` (named token) or `color` (one-shot base; derives every state)
 *   • style : `variant` (solid|soft|outline|ghost|link) + feature flag `gradient`
 *
 * Every state derives from `--button-color` via color-mix. Solid foreground uses
 * `contrast-color()` (auto black/white) with the `fg` prop / `--button-fg` as override.
 * Tone is a cva variant (static `[--button-color:…]` classes) so it also works through the
 * `buttonVariants()` helper. Literal class strings — Tailwind only emits what it can see.
 */

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
          // Colored tones tint the border toward the --border token; the neutral tone uses
          // --border directly (compound below) since its base is the near-white/black --primary.
          'border border-[color-mix(in_srgb,var(--button-color)_25%,var(--border))] text-[var(--button-color)] ' +
          'not-disabled:hover:bg-[color-mix(in_srgb,var(--button-color)_5%,transparent)]',
        ghost:
          'text-[var(--button-color)] not-disabled:hover:bg-[color-mix(in_srgb,var(--button-color)_10%,transparent)]',
        link: 'text-[var(--button-color)] underline-offset-4 not-disabled:hover:underline',
      },
      tone: {
        // Each tone sets its solid foreground (--button-fg) explicitly so solids don't depend
        // on contrast-color() support. neutral omits it → falls back to contrast-color (its
        // base is --primary, which flips light/dark). soft/outline/ghost ignore --button-fg.
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
      // Dimmed at rest, brightens to full on hover — for low-emphasis affordances (e.g. icon links).
      // `transition` (over the base `transition-colors`) so the brightness filter animates too.
      dim: {
        true: 'transition not-disabled:brightness-70 not-disabled:hover:brightness-100',
        false: '',
      },
    },
    compoundVariants: [
      // Neutral outline border = foreground at low opacity — adapts to light/dark and the
      // % is a meaningful visibility knob (unlike opacity of the near-white --border token).
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
