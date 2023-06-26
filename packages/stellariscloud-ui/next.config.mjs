/** @type {import('next').NextConfig} */

const APP_ENV = process.env.NEXT_PUBLIC_BACKEND_ENV || 'live'

import { withSentryConfig } from '@sentry/nextjs'
import dotenv from 'dotenv'

dotenv.config({
  path: `./config/.env.${APP_ENV}`,
})

const env = {}

Object.keys(process.env).forEach((key) => {
  if (key.startsWith('NEXT_PUBLIC_')) {
    env[key] = process.env[key]
  }
})

export default withSentryConfig({
  transpilePackages: [
    '@stellariscloud/types',
    '@stellariscloud/utils',
    '@stellariscloud/design-system',
    '@stellariscloud/auth-utils',
    '@stellariscloud/utils',
  ],
  sentry: {
    disableServerWebpackPlugin: true,
    disableClientWebpackPlugin: true,
  },
  reactStrictMode: false,
  experimental: {
    externalDir: false,
    esmExternals: true,
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.svg$/,
      use: [{ loader: '@svgr/webpack', options: { typescript: true } }],
    })

    return config
  },
  env,
  headers() {
    return [
      {
        source: '/:path*', // change to appropriate path
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ]
  },
})
