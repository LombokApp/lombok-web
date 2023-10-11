import { CheckIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import type { NextPage } from 'next'
import React from 'react'

const tiers = [
  {
    name: 'Self-Hosted',
    id: 'tier-freelancer',
    href: 'https://docs.stellariscloud.com',
    buttonText: 'Read the docs',
    priceMonthly: 'Free, forever',
    description:
      "Stellaris Cloud is designed first and foremost to run on premise, wether that's on servers in the office, on a laptop in your closet.",
    features: [
      'Unlimited users',
      'Unlimited folders',
      'Unlimited objects',
      'Unlimited workers',
      'Unlimited analytics (coming soon)',
      'Access to open source workers & integrations',
      'Access to hosted workers & integrations',
      'Custom workers & integrations',
      'Discord support',
    ],
    mostPopular: false,
    comingSoon: false,
  },
  {
    name: 'Managed instances',
    id: 'tier-startup',
    href: '#',
    priceMonthly: '$10',
    buttonText: 'Get on the waitlist',
    description:
      'An instance of Stellaris Cloud designed for a small, tight-knit group of users like a project team or an immediate family unit.',
    features: [
      '1 free content index worker',
      '5 users (+$2 per extra user)',
      '50 folders (+$2 per extra 10 folders)',
      '1M objects (+$2 per extra 100K objects)',
      'Analytics +$10 (coming soon)',
      'Access to open source workers & integrations',
      'Access to hosted workers & integrations',
      'Custom workers & integrations',
      'Discord or email support',
    ],
    mostPopular: false,
    comingSoon: true,
  },
  {
    name: 'Supporter package',
    id: 'tier-enterprise',
    href: '#',
    priceMonthly: '$300',
    buttonText: 'Contact us',
    description:
      'Be a part of building Stellaris Cloud, and get early access to the latest premium features and integrations.',
    features: [
      '10 managed instances',
      '10 free content index workers',
      '100 total users',
      '1K total folders',
      ' 10M total objects',
      'Access to premium workers & integrations',
      'Early access to all new features',
      'Dedicated custom worker support',
    ],
    mostPopular: true,
    comingSoon: false,
  },
]

const Sponser: NextPage = () => {
  return (
    <div className="h-full dark:bg-gradient-to-r dark:from-blue-950 dark:to-indigo-950 py-24 sm:py-32 overflow-y-auto">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-200 sm:text-5xl">
            Stellaris Cloud is open source
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600 dark:text-gray-400">
          Stellaris Cloud is completely open source and made to be self-hosted.
          For cases where that is not preferred, we offer hosted instances and
          optionally increased support.
        </p>
        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={clsx(
                'flex flex-col justify-between bg-white p-8 ring-1 ring-gray-200 xl:p-10',
                'rounded-xl sm:rounded-2xl md:rounded-3xl lg:rounded-none lg:last:rounded-r-3xl lg:first:rounded-l-3xl',
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-x-4">
                  <h3
                    id={tier.id}
                    className={clsx(
                      !tier.comingSoon ? 'text-indigo-600' : 'text-gray-900',
                      'text-lg font-semibold leading-8',
                    )}
                  >
                    {tier.name}
                  </h3>
                  {tier.comingSoon ? (
                    <p className="rounded-full bg-gray-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-gray-600">
                      coming soon
                    </p>
                  ) : null}
                  {tier.mostPopular ? (
                    <p className="rounded-full bg-indigo-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-indigo-600">
                      Most appreciated
                    </p>
                  ) : null}
                </div>
                <p className="mt-4 text-sm leading-6 text-gray-600 min-h-[5rem]">
                  {tier.description}
                </p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-gray-900">
                    {tier.priceMonthly}
                  </span>
                  {!tier.priceMonthly.toLowerCase().startsWith('free') && (
                    <span className="text-sm font-semibold leading-6 text-gray-600">
                      /month
                    </span>
                  )}
                </p>
                <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <CheckIcon
                        className="h-6 w-5 flex-none text-indigo-600"
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <a
                href={tier.href}
                aria-describedby={tier.id}
                className={clsx(
                  tier.mostPopular
                    ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500'
                    : 'text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:ring-indigo-300',
                  'mt-8 block rounded-md py-2 px-3 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
                )}
              >
                {tier.buttonText}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Sponser
