import type { NextPage } from 'next'
import React from 'react'

const Landing: NextPage = () => {
  const ref = React.useRef<HTMLDivElement>(null)
  return (
    <div className="h-full w-full text-center flex flex-col justify-around text-8xl">
      <div ref={ref} className="text-white">
        Stellaris Cloud
      </div>
    </div>
  )
}

export default Landing
