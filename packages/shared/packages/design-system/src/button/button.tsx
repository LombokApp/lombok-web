import clsx from 'clsx'
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ForwardedRef,
  LabelHTMLAttributes,
} from 'react'
import React, { forwardRef } from 'react'

import { Icon } from '../icon'

type BaseButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  AnchorHTMLAttributes<HTMLAnchorElement> &
  LabelHTMLAttributes<HTMLLabelElement> & {
    /**
     * Base HTML element to render.
     */
    as?: 'button' | 'a' | 'label'
    /**
     * Determines the color scheme of a button.
     */
    variant?: 'primary' | 'outline' | 'ghost' | 'secondary' | 'accent' | 'link'
    /**
     * Determines the size of the button. Mainly relates to text size and padding.
     */
    size?: 'xs' | 'sm' | 'md' | 'lg'
    /**
     * Whether or not to show a spinner beside the text
     */
    isLoading?: boolean

    preventDefaultOnClick?: boolean
  }

const BaseButton = forwardRef(function Button(
  {
    as = 'button',
    variant,
    size = 'md',
    className,
    children,
    isLoading,
    preventDefaultOnClick,
    onClick,
    ...rest
  }: BaseButtonProps,

  ref: ForwardedRef<any>,
) {
  const Component = as

  const clickHandler = (e: React.MouseEvent) => {
    if (preventDefaultOnClick) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (onClick) {
      onClick(e as React.MouseEvent<HTMLAnchorElement>)
    }
  }

  return (
    <Component
      ref={ref}
      onClick={clickHandler}
      className={clsx(
        'btn',
        'gap-2',
        variant === 'primary' ? 'btn-primary text-white' : null,
        variant === 'secondary' ? 'btn-secondary' : null,
        variant === 'accent' ? 'btn-accent' : null,
        variant === 'outline' ? 'btn-outline' : null,
        variant === 'ghost' ? 'btn-ghost' : null,
        variant === 'link' ? 'btn-link' : null,
        size === 'xs'
          ? 'btn-xs'
          : size === 'sm'
          ? 'btn-sm'
          : size === 'lg'
          ? 'btn-lg'
          : null,
        isLoading ? 'loading' : null,
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  )
})

type IconType = React.ForwardRefExoticComponent<
  React.SVGProps<SVGSVGElement> & {
    title?: string | undefined
    titleId?: string | undefined
  }
>

export interface ButtonProps extends BaseButtonProps {
  /**
   * The text to be rendered inside the button
   */
  children: React.ReactNode
  /**
   * Icon that will be rendered on the left side of the text
   */
  iconLeft?: IconType
  /**
   * Icon that will be rendered on the right side of the text
   */
  iconRight?: IconType
}

export const Button = forwardRef(function Button(
  { children, iconLeft, iconRight, isLoading, ...rest }: ButtonProps,
  ref: ForwardedRef<HTMLElement | undefined>,
) {
  return (
    <BaseButton ref={ref} isLoading={isLoading} {...rest}>
      {iconLeft && !isLoading ? <Icon icon={iconLeft} size="md" /> : null}
      {children}
    </BaseButton>
  )
})

export interface IconButtonProps
  extends Omit<ButtonProps, 'children' | 'iconLeft'> {
  icon: IconType
  /**
   * Meant for use as a cheap description of the button's function in lieu of text
   */
  title: string
}

export const IconButton = forwardRef(function IconButton(
  { icon, ...rest }: IconButtonProps,
  ref: ForwardedRef<HTMLElement | undefined>,
) {
  return (
    <BaseButton {...rest} ref={ref}>
      <Icon icon={icon} />
    </BaseButton>
  )
})
