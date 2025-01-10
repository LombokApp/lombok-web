import { useAuthContext } from '@stellariscloud/auth-utils'
import { Button, ButtonVariant } from '@stellariscloud/ui-toolkit'
import type { NextPage } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'

const Landing: NextPage = () => {
  const router = useRouter()
  const authContext = useAuthContext()
  const handleGetStarted = React.useCallback(() => {
    if (authContext.isAuthenticated) {
      void router.push('/folders')
    } else {
      void router.push('/signup')
    }
  }, [router, authContext.isAuthenticated])

  return (
    <div className="flex size-full flex-col justify-around text-center text-8xl">
      <div className="relative isolate h-full overflow-hidden pt-14">
        <img
          src="/home-bg.jpeg"
          alt=""
          className="absolute inset-0 -z-10 size-full object-cover"
        />
        <div className="absolute top-0 -z-10 size-full bg-black opacity-60" />
        <div
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>
        <div className="mx-auto max-w-3xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Open-source sovereign storage and compute infrastructure.
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Stellaris Cloud is a zero cost, zero lock-in, secure file storage
              and compute solution that you can run anywhere on any hardware.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button onClick={handleGetStarted}>Get started</Button>
              <Link href="https://github.com/stellariscloud/stellariscloud-monorepo">
                <Button
                  variant={ButtonVariant.link}
                  className="text-sm font-semibold leading-6 text-white"
                >
                  Learn more <span aria-hidden="true">→</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div
          className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default Landing
