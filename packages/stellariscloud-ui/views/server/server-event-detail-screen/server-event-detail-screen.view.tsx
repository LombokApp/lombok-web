import type { EventDTO } from '@stellariscloud/api-client'
import clsx from 'clsx'
import { useRouter } from 'next/router'
import React from 'react'

import { PageHeading } from '../../../design-system/page-heading/page-heading'

export function ServerEventDetailScreen({ event }: { event: EventDTO }) {
  const router = useRouter()

  return (
    <>
      <div
        className={clsx(
          'p-4 items-center flex flex-1 flex-col gap-6 h-full overflow-y-auto px-4',
        )}
      >
        <div className="container flex-1 flex flex-col">
          <div className="py-4 flex items-start gap-10">
            <PageHeading
              titleIconBg={'bg-amber-100'}
              avatarKey={event.id}
              title={['Server', 'Events', event.id]}
            />
          </div>
          <div className="pt-8">
            <div className="inline-block min-w-full py-2 align-middle">
              <pre>{JSON.stringify(event, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
