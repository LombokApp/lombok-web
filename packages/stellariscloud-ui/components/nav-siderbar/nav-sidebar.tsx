import {
  CircleStackIcon,
  FolderIcon,
  KeyIcon,
} from '@heroicons/react/24/outline'
import { Icon, NavLink } from '@stellariscloud/design-system'
import Image from 'next/image'

export const NavSidebar = () => (
  <div className="h-100 w-100 flex flex-col gap-6">
    <NavLink href={'/'}>
      <div className="p-4">
        <Image
          src="/stellariscloud.png"
          width={32}
          height={32}
          alt="Stellaris cloud logo"
        />
      </div>
    </NavLink>
    <NavLink href={'/folders'}>
      <Icon size="md" icon={FolderIcon} />
    </NavLink>
    <NavLink href={'/s3-connections'}>
      <Icon size="md" icon={CircleStackIcon} />
    </NavLink>
    <NavLink href={'/workers'}>
      <Icon size="md" icon={KeyIcon} />
    </NavLink>
  </div>
)
