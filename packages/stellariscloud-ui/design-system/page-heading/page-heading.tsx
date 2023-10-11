import { ChevronRightIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Image from 'next/image'

import { Avatar } from '../avatar'
import { Button } from '../button/button'
import type { IconProps } from '../icon'
import { Icon } from '../icon'

export function PageHeading({
  title,
  properties = [],
  ancestorTitle,
  ancestorTitleIcon,
  ancestorTitleIconBg,
  ancestorHref,
  subtitle,
  subtitleIcon,
  titleIcon,
  titleIconBg = 'bg-blue-500 dark:bg-blue-700',
  titleIconSrc,
  children,
  onAncestorPress,
  avatarKey,
}: {
  title: string | string[]
  subtitle?: string
  subtitleIcon?: IconProps['icon']
  ancestorTitle?: string
  ancestorHref?: string
  ancestorTitleIcon?: IconProps['icon']
  ancestorTitleIconBg?: string
  avatarKey?: string
  titleIconSrc?: string
  titleIcon?: IconProps['icon']
  titleIconBg?: string
  properties?: { icon: IconProps['icon']; value: string; monospace?: boolean }[]
  children?: React.ReactNode
  onAncestorPress?: (ancestorHref: string) => void
}) {
  return (
    <div className="flex flex-col items-start lg:flex-row w-full">
      <div className="min-w-0 flex flex-col gap-1 flex-1 py-3 text-gray-900 dark:text-white">
        <div className="flex flex-col items-start gap-6">
          <div className="flex items-start gap-4">
            {titleIcon && (
              <div>
                <div
                  className={clsx(
                    'relative h-36 w-36 sm:h-24 sm:w-24 md:h-18 md:w-18 lg:h-16 lg:w-16 flex items-center justify-center flex-shrink-0 overflow-hidden',
                    titleIconSrc ? '' : 'rounded-full',
                    titleIconBg,
                  )}
                >
                  {titleIconSrc ? (
                    <Image
                      alt={typeof title === 'string' ? title : title[0]}
                      src={titleIconSrc}
                      fill
                      objectFit="cover"
                    />
                  ) : (
                    <Icon size="sm" className="text-white" icon={titleIcon} />
                  )}
                </div>
              </div>
            )}
            {!titleIconSrc && avatarKey && (
              <div className={clsx(titleIconBg, 'rounded-full')}>
                <Avatar uniqueKey={avatarKey} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold leading-7 sm:truncate sm:text-2xl sm:tracking-tight">
                  <div className="flex gap-2">
                    {typeof title === 'string'
                      ? title
                      : title.map((t, i) => (
                          <div key={i} className="flex items-center gap-2">
                            {i > 0 && (
                              <Icon size="sm" icon={ChevronRightIcon} />
                            )}
                            <div className="">{t}</div>
                          </div>
                        ))}
                  </div>
                </h2>
                {ancestorTitle && ancestorTitleIcon && ancestorTitleIconBg && (
                  <a
                    href={ancestorHref}
                    onClick={(e) => {
                      e.preventDefault()
                      if (ancestorHref && onAncestorPress) {
                        onAncestorPress(ancestorHref)
                      }
                    }}
                  >
                    <Button size="xs">
                      <div className={clsx('flex items-center gap-2')}>
                        <Icon
                          size="xs"
                          className="text-gray-800"
                          icon={ancestorTitleIcon}
                        />
                        <div>{ancestorTitle}</div>
                      </div>
                    </Button>
                  </a>
                )}
              </div>
              {subtitle && (
                <div className="flex gap-2">
                  {subtitleIcon && <Icon size="sm" icon={subtitleIcon} />}
                  <div className="opacity-60">{subtitle}</div>
                </div>
              )}
              <div className="flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap gap-x-4">
                {properties.map((property, i) => (
                  <div
                    className="mt-2 flex items-center gap-1 text-sm text-gray-700 dark:text-white/70"
                    key={`${i}_${property.value}`}
                  >
                    <Icon
                      icon={property.icon}
                      size="sm"
                      className="text-gray-700 dark:text-white/70"
                    />
                    <span
                      className={clsx(
                        'truncate overflow-hidden',
                        property.monospace && 'font-mono',
                      )}
                    >
                      {property.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {children && (
        <div className={clsx('flex flex-1')}>
          <div className="flex gap-2 justify-end w-full">{children}</div>
        </div>
      )}
    </div>
  )
}
