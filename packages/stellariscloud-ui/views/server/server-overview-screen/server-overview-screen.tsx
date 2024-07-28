import React from 'react'

export function ServerOverview({
  serverInfo,
}: {
  serverInfo: { hostname: string }
}) {
  return (
    <div className="">
      <div className="">
        <dl className="divide-y divide-gray-100 dark:divide-gray-800">
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900 dark:text-gray-400">
              Hostname
            </dt>
            <dd className="mt-1 text-sm leading-6 text-gray-900 dark:text-gray-300 sm:col-span-2 sm:mt-0">
              https://{serverInfo.hostname}
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900 dark:text-gray-400">
              About
            </dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 dark:text-gray-300 sm:col-span-2 sm:mt-0">
              Fugiat ipsum ipsum deserunt culpa aute sint do nostrud anim
              incididunt cillum culpa consequat. Excepteur qui ipsum aliquip
              consequat sint. Sit id mollit nulla mollit nostrud in ea officia
              proident. Irure nostrud pariatur mollit ad adipisicing
              reprehenderit deserunt qui eu.
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
