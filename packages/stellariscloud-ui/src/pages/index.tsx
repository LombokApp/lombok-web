import { useAuthContext } from '@stellariscloud/auth-utils'
import { Button, ButtonVariant } from '@stellariscloud/ui-toolkit'
import React from 'react'
import { useNavigate } from 'react-router-dom'

export const LandingPage = () => {
  const navigate = useNavigate()
  const authContext = useAuthContext()
  const handleGetStarted = React.useCallback(() => {
    if (authContext.isAuthenticated) {
      void navigate('/folders')
    } else {
      void navigate('/signup')
    }
  }, [authContext.isAuthenticated, navigate])

  return (
    <div className="flex size-full flex-col justify-around text-center text-8xl">
      <div className="relative isolate h-full overflow-hidden pt-14">
        <img
          src="/home-bg.jpeg"
          alt=""
          className="absolute inset-0 -z-10 size-full object-cover"
        />
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
              <a href="https://github.com/stellariscloud/stellariscloud-monorepo">
                <Button
                  variant={ButtonVariant.link}
                  className="text-sm font-semibold leading-6 text-white"
                >
                  Learn more <span aria-hidden="true">→</span>
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
