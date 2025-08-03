import './styles/globals.css'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { SdkDemo } from './components/SdkDemo'

const queryClient = new QueryClient()

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Header */}
        <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="container mx-auto p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="size-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600"></div>
                <span className="text-xl font-bold text-white">
                  StellarisCloud
                </span>
              </div>
              <nav className="hidden space-x-6 md:flex">
                <a
                  href="#"
                  className="text-white/70 transition-colors hover:text-white"
                >
                  Features
                </a>
                <a
                  href="https://stellariscloud.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 transition-colors hover:text-white"
                >
                  Documentation
                </a>
                <a
                  href="#"
                  className="text-white/70 transition-colors hover:text-white"
                >
                  About
                </a>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-white/90">
              🚀 App Development Demo
            </div>
            <h1 className="mb-6 text-5xl font-bold text-white md:text-7xl">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                StellarisCloud
              </span>
            </h1>
            <p className="mx-auto mb-8 max-w-3xl text-xl text-white/70">
              Experience the future of cloud computing with our powerful,
              scalable, and intuitive platform. Built for developers who demand
              excellence.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <button className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3 font-semibold text-white transition-all duration-200 hover:scale-105 hover:from-blue-600 hover:to-purple-700">
                Get Started
              </button>
              <button className="rounded-lg border border-white/20 px-8 py-3 font-semibold text-white transition-all duration-200 hover:bg-white/10">
                View Documentation
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-white">
              Why Choose StellarisCloud?
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-white/70">
              Discover the features that make our platform the preferred choice
              for modern applications.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-blue-600">
                <svg
                  className="size-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                Lightning Fast
              </h3>
              <p className="text-white/70">
                Optimized performance with edge computing and intelligent
                caching for the fastest user experience.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-purple-600">
                <svg
                  className="size-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                Enterprise Security
              </h3>
              <p className="text-white/70">
                Bank-grade security with end-to-end encryption and compliance
                with industry standards.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-gradient-to-r from-green-500 to-green-600">
                <svg
                  className="size-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                Auto Scaling
              </h3>
              <p className="text-white/70">
                Intelligent auto-scaling that adapts to your traffic patterns
                and optimizes costs automatically.
              </p>
            </div>
          </div>
        </section>

        {/* SDK Demo Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-white">
              SDK Integration Demo
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-white/70">
              This demonstrates the app-browser-sdk integration for iframe
              applications.
            </p>
          </div>
          <div className="mx-auto max-w-4xl">
            <SdkDemo />
          </div>
        </section>

        {/* Stats Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="grid gap-8 text-center md:grid-cols-4">
            <div>
              <div className="mb-2 text-4xl font-bold text-white">99.9%</div>
              <div className="text-white/70">Uptime</div>
            </div>
            <div>
              <div className="mb-2 text-4xl font-bold text-white">50ms</div>
              <div className="text-white/70">Average Response</div>
            </div>
            <div>
              <div className="mb-2 text-4xl font-bold text-white">10M+</div>
              <div className="text-white/70">Active Users</div>
            </div>
            <div>
              <div className="mb-2 text-4xl font-bold text-white">24/7</div>
              <div className="text-white/70">Support</div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center text-white/70">
              <p>&copy; 2024 StellarisCloud. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  )
}
