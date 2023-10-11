import type { NextPage } from 'next'
import React from 'react'

const HowItWorks: NextPage = () => {
  return (
    <div className="h-full py-24 sm:py-32 overflow-y-auto">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-200 sm:text-5xl">
            How does it work?
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600 dark:text-gray-400">
          This is how...
        </p>
      </div>
    </div>
  )
}

export default HowItWorks
