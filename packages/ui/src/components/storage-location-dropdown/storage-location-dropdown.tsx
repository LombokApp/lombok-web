import type { StorageProvisionDTO } from '@lombokapp/types'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@lombokapp/ui-toolkit'

export function StorageLocationDropdown({
  storageProvisions,
  onSelectStorageProvision,
  onSelectCustom,
}: {
  storageProvisions: StorageProvisionDTO[]
  onSelectStorageProvision: (storageProvision: StorageProvisionDTO) => void
  onSelectCustom: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default">{'Select location'}</Button>
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
