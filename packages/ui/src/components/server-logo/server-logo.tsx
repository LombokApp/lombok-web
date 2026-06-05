import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'

import { usePublicSettingsContext } from '@/src/contexts/public-settings'

type ServerLogoSize = 'sm' | 'md' | 'lg'

const SIZE_TO_KEY: Record<ServerLogoSize, 'small' | 'medium' | 'large'> = {
  sm: 'small',
  md: 'medium',
  lg: 'large',
}

interface ServerLogoProps {
  size?: ServerLogoSize
  className?: string
  alt?: string
}

export function ServerLogo({
  size = 'md',
  className,
  alt = 'Lombok',
}: ServerLogoProps) {
  const { settings } = usePublicSettingsContext()
  const customSrc = settings?.serverIcon?.[SIZE_TO_KEY[size]]
  const src = customSrc ?? '/logo.png'
  return <img src={src} alt={alt} className={cn(className)} />
}
