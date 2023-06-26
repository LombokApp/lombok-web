import { PlusIcon } from '@heroicons/react/24/outline'
import { Button, Icon } from '@stellariscloud/design-system'

export const S3ConnectionsEmptyState = ({
  onStartCreate,
}: {
  onStartCreate: () => void
}) => (
  <div className="flex flex-col gap-4">
    You have no S3 connections
    <Button size="md" onClick={onStartCreate}>
      <Icon size="md" icon={PlusIcon} />
      Add S3 connection
    </Button>
  </div>
)
