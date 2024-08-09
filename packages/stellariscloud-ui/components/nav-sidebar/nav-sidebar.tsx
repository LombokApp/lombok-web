import clsx from 'clsx'
import { AppMenuItemAndHref } from '../../contexts/server.context'
import { IAuthContext } from '@stellariscloud/auth-utils'
import { ThemeSwitch } from '../theme-switch/theme-switch'
import {
  ArrowRightEndOnRectangleIcon,
  CircleStackIcon,
  Cog6ToothIcon,
  CubeIcon,
  FolderIcon,
  HomeIcon,
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
      name: 'Folders',
      href: '/folders',
      icon: FolderIcon,
      current: router.asPath.startsWith('/folders'),
    },
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
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6">
      <div className="flex justify-between h-20 shrink-0 items-center">
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
        <ThemeSwitch isVertical={false} />
      </div>
      <nav className="flex flex-1 flex-col">
        <div className="text-xs font-semibold leading-6 text-gray-400">
          User
        </div>
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => (
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
          </li>
          {menuItems.length && (
            <li>
              <div className="text-xs font-semibold leading-6 text-gray-400">
                Apps
              </div>
              <ul role="list" className="-mx-2 mt-2 space-y-1">
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
            </li>
          )}
          {authContext.viewer?.isAdmin && (
            <li>
              <div className="text-xs font-semibold leading-6 text-gray-400">
                Server
              </div>
              <ul role="list" className="-mx-2 mt-2 space-y-1">
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
            </li>
          )}
          {authContext.viewer && (
            <li className="-mx-6 mt-auto pr-6">
              <div className="flex items-center justify-between">
                <Link
                  href="/profile"
                  className="text-sm font-semibold leading-6 text-white px-3 py-3 group"
                >
                  <div className="flex items-center gap-x-4 px-4 py-2 group-hover:bg-gray-800/70 rounded-xl">
                    <Avatar
                      className="bg-gray-50/10"
                      size="sm"
                      uniqueKey={authContext.viewer.id}
                    />
                    <span className="sr-only">Your profile</span>
                    <span aria-hidden="true">
                      {authContext.viewer.username}
                    </span>
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
            </li>
          )}
        </ul>
      </nav>
    </div>
  )
}
