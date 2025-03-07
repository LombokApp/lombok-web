import type { UserStorageProvisionDTO } from '@stellariscloud/api-client'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@stellariscloud/ui-toolkit'

export function StorageLocationDropdown({
  storageProvisions,
  onSelectStorageProvision,
  onSelectCustom,
}: {
  storageProvisions: UserStorageProvisionDTO[]
  onSelectStorageProvision: (storageProvision: UserStorageProvisionDTO) => void
  onSelectCustom: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">{'Select storage location'}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Available storage locations</DropdownMenuLabel>
        <DropdownMenuGroup>
          {storageProvisions.map((provision) => (
            <DropdownMenuItem
              key={provision.id}
              onSelect={() => onSelectStorageProvision(provision)}
            >
              {provision.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onSelectCustom}>
            Custom location
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
