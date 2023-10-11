import type { ShareEventPublicDTO } from '@stellariscloud/types'

import { Button } from '../../design-system/button/button'
import { Heading } from '../../design-system/typography'

export const ShareEventList = ({
  shareEvents,
}: {
  shareEvents?: ShareEventPublicDTO[]
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Heading className="py-2" level={3}>
        Events
      </Heading>
      {shareEvents?.length === 0 && (
        <div className="italic text-xs opacity-70">No events</div>
      )}

      <div className="flex-1 overflow-auto">
        <div className="h-full flex flex-col">
          {shareEvents?.map((ev, i) => (
            <div className="flex flex-col" key={i}>
              <div>
                {new Date(ev.timestamp).toISOString()} -{' '}
                {ev.context['cf-connecting-ip']} - {ev.context['cf-ipcountry']}
              </div>
              <div>{ev.context['user-agent']}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 py-4">
        <Button primary>Previous</Button>
        <Button primary>Next</Button>
      </div>
    </div>
  )
}
