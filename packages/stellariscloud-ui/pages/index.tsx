import type { NextPage } from 'next'
import { PowerGlitch } from 'powerglitch'
import React from 'react'

const Landing: NextPage = () => {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (ref.current) {
      PowerGlitch.glitch(ref.current, {
        playMode: 'always',
        hideOverflow: true,
        timing: {
          duration: 1000,
          iterations: 100,
          easing: 'ease-in-out',
        },
        glitchTimeSpan: {
          start: 0.2,
          end: 0.9,
        },
        // shake: {
        //   velocity: 10,
        //   amplitudeX: 0.9,
        //   amplitudeY: 0.4,
        // },
        slice: {
          count: 4,
          velocity: 2,
          minHeight: 0.02,
          maxHeight: 0.6,
          hueRotate: true,
        },
      })
    }
  }, [ref])
  return (
    <div className="h-full w-full text-center flex flex-col justify-around text-8xl">
      <div ref={ref} className="text-red-500">
        Stellaris Cloud
      </div>
    </div>
  )
}

export default Landing
