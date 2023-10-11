import clsx from 'clsx'
import { minidenticon } from 'minidenticons'

interface AvatarProps {
  uniqueKey?: string | undefined
  numColors?: number
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const DEFAULT_SATURATION = 75

export const Avatar = ({ uniqueKey, className, size = 'md' }: AvatarProps) => {
  const key = !uniqueKey ? '0x0' : uniqueKey
  return (
    <div>
      <div
        className={clsx(
          'flex rounded-full',
          size === 'xl'
            ? 'p-4'
            : size === 'lg'
            ? 'p-4'
            : size === 'md'
            ? 'p-2'
            : size === 'sm'
            ? 'p-1'
            : '',
          className ? className : '',
        )}
      >
        <div className="avatar">
          <div
            className={clsx(
              'mask',
              size === 'xs' ? 'w-4 h-4' : null,
              size === 'sm' ? 'w-8 h-8' : null,
              size === 'md' ? 'w-12 h-12' : null,
              size === 'lg' ? 'w-16 h-16' : null,
              size === 'xl' ? 'w-24 h-24' : null,
            )}
            dangerouslySetInnerHTML={{
              __html: minidenticon(key, DEFAULT_SATURATION),
            }}
          />
        </div>
      </div>
    </div>
  )
}
