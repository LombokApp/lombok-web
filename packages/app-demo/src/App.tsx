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
                <div className="size-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
                  <img
                    src="/assets/logo.png"
                    alt="StellarisCloud"
                    className="size-full"
                  />
                </div>
                <span className="text-xl font-bold text-white">
                  StellarisCloud
                </span>
              </div>
              <nav className="hidden space-x-6 md:flex">
                <a
                  href="https://stellariscloud.com/docs/introduction"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 transition-colors hover:text-white"
                >
                  Documentation
                </a>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-white/90">
              🚀 Stellaris Cloud App Platform
            </div>
            <h1 className="mb-6 text-5xl font-bold text-white md:text-7xl">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Stellaris Cloud App Platform
              </span>
            </h1>
            <p className="mx-auto mb-8 max-w-3xl text-xl text-white/70">
              Build and deploy apps that integrate seamlessly with Stellaris
              Cloud: respond to platform events, publish embedded UIs, and
              orchestrate asynchronous work with Tasks.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href="https://stellariscloud.com/docs/technical-design/app-platform"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3 font-semibold text-white transition-all duration-200 hover:scale-105 hover:from-blue-600 hover:to-purple-700"
              >
                Read the App Platform Guide
              </a>
              <a
                href="https://stellariscloud.com/docs/introduction"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/20 px-8 py-3 font-semibold text-white transition-all duration-200 hover:bg-white/10"
              >
                General Documentation
              </a>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-10">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-white">
              Build apps that extend Stellaris Cloud
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-white/70">
              The App Platform lets you integrate deeply with the core product
              using event-driven workflows, embedded UIs, and powerful async
              processing.
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
                    d="M15 7a2 2 0 11-4 0 2 2 0 014 0zM4 8v8a2 2 0 002 2h12a2 2 0 002-2V8M4 12h16"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                Event-driven apps and workers
              </h3>
              <p className="text-white/70">
                Respond to events like <code>object_created</code> and{' '}
                <code>object_updated</code>. Run as external services or managed
                worker scripts inside Stellaris Cloud.
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
                    d="M3 7h18M9 3v4m6-4v4M8 11h8m-8 4h5m-5 4h8"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                Events, logs, and Tasks
              </h3>
              <p className="text-white/70">
                Emit your own domain events and logs, and orchestrate
                asynchronous work using Tasks to process workloads reliably.
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
                    d="M4 6h16M4 10h16M4 14h10M6 18h8"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                Embedded UIs inside Stellaris Cloud
              </h3>
              <p className="text-white/70">
                Publish secure, embedded user interfaces that render directly
                within the Stellaris Cloud UI for a seamless experience.
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

        {/* Footer */}
        <footer className="border-t border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center text-white/70">
              <p>&copy; 2025 StellarisCloud. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  )
}
