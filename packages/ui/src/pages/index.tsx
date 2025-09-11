import { useAuthContext } from '@lombokapp/auth-utils'
import { ButtonVariant } from '@lombokapp/ui-toolkit/components/button'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import React from 'react'
import { useNavigate } from 'react-router'

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
    <div className="flex size-full flex-col">
      <div className="relative isolate size-full min-h-[calc(100vh-56px)] overflow-hidden pt-14">
        <img
          src="/home-bg.jpeg"
          alt="Lombok background"
          className="absolute inset-0 -z-20 size-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/60 via-black/20 to-black/80" />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 -z-10 -translate-x-1/2 blur-3xl"
        >
          <div className="h-64 w-[80vw] max-w-5xl rounded-full bg-gradient-to-tr from-indigo-400/40 via-sky-300/40 to-teal-300/40 opacity-50" />
        </div>

        <div className="relative mx-auto max-w-5xl px-6 py-24 sm:py-36 lg:py-44">
          <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-xl backdrop-blur-md sm:p-12">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Open-source{' '}
              <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-teal-300 bg-clip-text text-transparent">
                sovereign
              </span>{' '}
              storage and compute infrastructure.
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-200">
              Lombok is a zero cost, zero lock-in, secure file storage and
              compute solution that you can run anywhere on any hardware.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button onClick={handleGetStarted}>Get started</Button>
              <a className="flex" href="https://lombokapp.com">
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

        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/2 -z-10 -translate-x-1/2 blur-3xl"
        >
          <div className="h-72 w-[90vw] max-w-6xl rounded-full bg-gradient-to-br from-teal-300/30 via-sky-300/30 to-indigo-400/30 opacity-40" />
        </div>
      </div>
    </div>
  )
}
