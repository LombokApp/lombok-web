import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function colorMix(color: string, opacity?: number) {
  return `color-mix(in srgb, var(--${color}) calc(${opacity || '<alpha-value>'} * 100%), transparent)`
}
