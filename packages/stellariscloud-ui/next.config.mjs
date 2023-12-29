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

const ContentSecurityPolicy = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    child-src 'self';
    style-src 'self' 'unsafe-inline';
    img-src * blob: data:;
    media-src 'none';
    connect-src *;
    font-src 'self' data:;
    frame-src 'self' *.stellariscloud.localhost:*;
`

const securityHeaders = [
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\n/g, ''),
  },
  // // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
  // {
  //   key: 'X-Content-Type-Options',
  //   value: 'nosniff',
  // },
  // // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-DNS-Prefetch-Control
  // {
  //   key: 'X-DNS-Prefetch-Control',
  //   value: 'on',
  // },
  // // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
  // {
  //   key: 'Strict-Transport-Security',
  //   value: 'max-age=31536000; includeSubDomains; preload',
  // },
  // // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy
  // {
  //   key: 'Permissions-Policy',
  //   value: 'camera=(), microphone=(), geolocation=()',
  // },
]

export default withSentryConfig({
  transpilePackages: [
    '@stellariscloud/types',
    '@stellariscloud/utils',
    '@stellariscloud/auth-utils',
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
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
})
