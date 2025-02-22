import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components'

import { ServerAccessKeysScreen } from '../server-access-keys/server-access-keys/server-access-keys-screen.view'
import { ServerStorageLocation } from '../server-storage-location/server-storage-location.view'
import { UserStorageProvisions } from '../user-storage-provisions/user-storage-provisions.view'

export function ServerStorageConfigTab() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Server Storage Location</CardTitle>
          <CardDescription>
            Designate an S3 location where your server can store server level
            data, like app assets and payloads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <ServerStorageLocation />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>User Storage Provisions</CardTitle>
          <CardDescription>
            Designate S3 locations that are provided to your users as managed
            storage options for new folders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <UserStorageProvisions />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Access Keys In Use</CardTitle>
          <CardDescription>
            Distinct server provisioned S3 credentials in use by all users
            across the server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ServerAccessKeysScreen />
        </CardContent>
      </Card>
    </div>
  )
}
