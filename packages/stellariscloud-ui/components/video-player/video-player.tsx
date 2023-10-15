import clsx from 'clsx'

interface VideoPlayerProps {
  width: string
  height: string
  src: string
  grayscale?: boolean
  autoPlay?: boolean
  className?: string
  controls?: boolean
  type?: string
}

export const VideoPlayer = ({
  src,
  width,
  height,
  autoPlay = false,
  controls = true,
  grayscale = false,
  className,
  type = 'video/mp4',
}: VideoPlayerProps) => {
  return (
    <div
      className={clsx(
        grayscale && 'ease-in-out duration-200 grayscale hover:grayscale-0',
      )}
    >
      <video
        className={className}
        playsInline
        controls={controls}
        autoPlay={autoPlay}
        muted
        loop
        style={{ width, height }}
      >
        <source src={src} type={type} />
      </video>
    </div>
  )
}
