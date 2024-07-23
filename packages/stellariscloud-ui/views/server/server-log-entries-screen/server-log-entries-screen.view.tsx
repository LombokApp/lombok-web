import type { LogEntryDTO } from '@stellariscloud/api-client'
import { useRouter } from 'next/router'
import React from 'react'

import { Table } from '../../../design-system/table/table'
import { apiClient } from '../../../services/api'
import { timeSinceOrUntil } from '@stellariscloud/utils'

export function ServerLogEntriesScreen() {
  const router = useRouter()
  const [events, setEvents] = React.useState<LogEntryDTO[]>()
  React.useEffect(() => {
    void apiClient.logEntriesApi
      .listLogEntries()
      .then((response) => setEvents(response.data.result))
  }, [])
  return (
    <div className="">
      {events && (
        <div className="flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <Table
                headers={[
                  'Log Entry ID',
                  'App',
                  'Message',
                  'Data',
                  'Created At',
                ]}
                rows={events.map((logEntry, i) => [
                  <div key={i} className="flex items-center gap-4">
                    <div className="flex flex-col pl-4">
                      <div>{logEntry.id.slice(0, 8)}</div>
                    </div>
                  </div>,
                  <div>
                    <div className="flex flex-col">
                      <div>{logEntry.appIdentifier}</div>
                    </div>
                  </div>,
                  <div>
                    <div className="flex flex-col">
                      <div>{logEntry.message}</div>
                    </div>
                  </div>,
                  <div>
                    <div className="flex flex-col">
                      <div>Data: {logEntry.data}</div>
                    </div>
                  </div>,
                  <div>
                    <div className="flex flex-col">
                      <div>
                        {timeSinceOrUntil(new Date(logEntry.createdAt))}
                      </div>
                      <div className="text-xs">
                        {new Date(logEntry.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>,
                ])}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
