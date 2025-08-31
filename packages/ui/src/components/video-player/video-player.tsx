import { cn } from '@lombokapp/ui-toolkit'

interface VideoPlayerProps {
  width?: string
  height?: string
  src: string
  grayscale?: boolean
  autoPlay?: boolean
  className?: string
  controls?: boolean
  muted?: boolean
  loop?: boolean
}

export const VideoPlayer = ({
  src,
  autoPlay = false,
  controls = true,
  grayscale = false,
  muted = false,
  loop = false,
  className,
}: VideoPlayerProps) => {
  return (
    <div
      className={cn(
        'flex flex-col justify-center',
        grayscale && 'grayscale duration-200 ease-in-out hover:grayscale-0',
      )}
    >
      <video
        className={className}
        playsInline
        controls={controls}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
      >
        {src && <source src={src} />}
      </video>
    </div>
  )
}
