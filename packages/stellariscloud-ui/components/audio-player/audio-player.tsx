interface AudioPlayerProps {
  width: string
  height: string
  src: string
  autoPlay?: boolean
  className?: string
  controls?: boolean
  type?: string
}

export const AudioPlayer = ({
  src,
  width,
  height,
  autoPlay = false,
  controls = true,
  className,
  type = 'audio/mp4',
}: AudioPlayerProps) => {
  return (
    <audio
      className={className}
      controls={controls}
      autoPlay={autoPlay}
      muted
      loop
      style={{ width, height }}
    >
      <source src={src} type={type} />
    </audio>
  )
}
