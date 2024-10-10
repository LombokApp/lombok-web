import clsx from 'clsx'
import { AppMenuItemAndHref } from '../../contexts/server.context'
import { IAuthContext } from '@stellariscloud/auth-utils'
import {
  ArrowRightEndOnRectangleIcon,
  CircleStackIcon,
  Cog6ToothIcon,
  CubeIcon,
  FolderIcon,
  KeyIcon,
  SignalIcon,
  Square3Stack3DIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import Image from 'next/image'
import { NextRouter } from 'next/router'
import { Icon } from '../../design-system/icon'
import { Avatar } from '../../design-system/avatar'
import { Button } from '../../design-system/button/button'
import { ModeToggle } from '../mode-toggle/mode-toggle'

const protocol =
  typeof window === 'undefined'
    ? undefined
    : new URL(window.document.URL).protocol

export const NavSidebar = ({
  menuItems,
  authContext,
  hideSidebar,
  router,
}: {
  authContext: IAuthContext
  menuItems: AppMenuItemAndHref[]
  hideSidebar: boolean
  router: NextRouter
}) => {
  const navigation = [
    {
      name: 'Access Keys',
      href: '/access-keys',
      icon: KeyIcon,
      current: router.asPath.startsWith('/access-keys'),
    },
  ]
  const serverNavigation = [
    {
      name: 'Overview',
      href: '/server/overview',
      icon: HomeIcon,
      current: router.asPath.startsWith('/server/overview'),
    },
    { name: 'Users', href: '/server/users', icon: UsersIcon, current: false },
    {
      name: 'Storage',
      href: '/server/storage',
      icon: CircleStackIcon,
      current: router.asPath.startsWith('/server/storage'),
    },
    {
      name: 'Apps',
      href: '/server/apps',
      icon: Square3Stack3DIcon,
      current: router.asPath.startsWith('/server/apps'),
    },
    {
      name: 'Events',
      href: '/server/events',
      icon: SignalIcon,
      current: router.asPath.startsWith('/server/events'),
    },
    {
      name: 'Settings',
      href: '/server/settings',
      icon: Cog6ToothIcon,
      current: router.asPath.startsWith('/server/settings'),
    },
  ]

  return (
    <div className="flex grow flex-col justify-between gap-y-5 overflow-hidden bg-background h-full flex-1">
      <div className="flex justify-between h-14 shrink-0 items-center px-2">
        <Link href={'/'} passHref>
          <Image
            className="rounded-full"
            priority
            src="/stellariscloud.png"
            width={32}
            height={32}
            alt="Stellaris cloud logo"
          />
        </Link>
        <ModeToggle />
      </div>
      <nav className="flex flex-1 flex-col overflow-hidden">
        <div className="overflow-y-auto px-2 flex flex-col gap-4">
          <div className="flex flex-col">
            <div className="pl-2 text-xs font-semibold leading-6 text-gray-400 opacity-50">
              Folders
            </div>
            <div className="flex flex-1 flex-col gap-y-7 overflow-hidden">
              <div>
                <ul role="list" className="space-y-1">
                  <li>
                    <Link
                      href={'/folders'}
                      className={clsx(
                        router.asPath === '/folders'
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                        'group flex gap-x-3 p-2 text-sm font-semibold leading-6 rounded-md overflow-hidden',
                      )}
                    >
                      <Icon
                        icon={FolderIcon}
                        aria-hidden="true"
                        className="h-6 w-6 shrink-0"
                      />
                      All Folders
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="pl-2 text-xs font-semibold leading-6 text-gray-400 opacity-50">
              Account
            </div>
            <div className="flex flex-1 flex-col gap-y-7 overflow-hidden">
              <ul role="list" className="space-y-1">
                {navigation.map((item) => (
                  <li key={item.name} className="">
                    <Link
                      href={item.href}
                      className={clsx(
                        item.current
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                        'group flex gap-x-3 p-2 text-sm font-semibold leading-6 rounded-md overflow-hidden',
                      )}
                    >
                      <item.icon
                        aria-hidden="true"
                        className="h-6 w-6 shrink-0"
                      />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {menuItems.length > 0 && (
            <div className="flex flex-col">
              <div className="pl-2 text-xs font-semibold leading-6 text-gray-400 opacity-50">
                Apps
              </div>
              <ul role="list" className="space-y-1">
                {menuItems.map((item, i) => (
                  <li key={i}>
                    <Link
                      href={item.href}
                      className={clsx(
                        router.asPath.startsWith(item.href)
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                        'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {item.iconPath ? (
                          <img
                            className="rounded-lg bg-black/50"
                            width={40}
                            height={40}
                            alt={item.label}
                            src={`${protocol}//${item.uiName}.${item.appIdentifier}.apps.${process.env.NEXT_PUBLIC_API_HOST}${item.iconPath}`}
                            aria-hidden="true"
                          />
                        ) : (
                          <>
                            <Icon size="md" icon={CubeIcon} />
                          </>
                        )}
                        {item.label}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {authContext.viewer?.isAdmin && (
            <div className="flex flex-col">
              <div className="pl-2 text-xs font-semibold leading-6 text-gray-400 opacity-50">
                Server
              </div>
              <ul role="list" className="space-y-1">
                {serverNavigation.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={clsx(
                        item.current
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                        'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6',
                      )}
                    >
                      <item.icon
                        aria-hidden="true"
                        className="h-6 w-6 shrink-0"
                      />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {authContext.viewer && (
          <div className="mt-auto bg-black/15 py-2 px-2">
            <div className="flex items-center justify-between">
              <Link
                href="/profile"
                className="-ml-2 text-sm font-semibold leading-6 text-white px-3 py-1 group"
              >
                <div className="flex items-center gap-x-2 px-1 py-1 pr-3 group-hover:bg-gray-800/70 rounded-full">
                  <Avatar
                    className="bg-gray-50/10"
                    size="sm"
                    uniqueKey={authContext.viewer.id}
                  />
                  <span className="sr-only">Your profile</span>
                  <span aria-hidden="true">{authContext.viewer.username}</span>
                </div>
              </Link>
              <Button link onClick={() => authContext.logout()}>
                <Icon
                  className="text-gray-50"
                  size="md"
                  icon={ArrowRightEndOnRectangleIcon}
                />
              </Button>
            </div>
          </div>
        )}
      </nav>
    </div>
  )
}
