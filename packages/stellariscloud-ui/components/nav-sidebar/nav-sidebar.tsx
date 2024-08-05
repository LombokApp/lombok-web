import clsx from 'clsx'
import { AppMenuItemAndHref } from '../../contexts/server.context'
import {
  AuthenticatorStateType,
  IAuthContext,
} from '@stellariscloud/auth-utils'
import { ThemeSwitch } from '../theme-switch/theme-switch'
import {
  ArrowRightEndOnRectangleIcon,
  CubeIcon,
  FolderOpenIcon,
  KeyIcon,
  ServerStackIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import Image from 'next/image'
import { NextRouter } from 'next/router'
import { Icon } from '../../design-system/icon'

const SIDEBAR_COLOR =
  // 'lg:bg-indigo-600 dark:lg:bg-indigo-800 transition duration-100'
  'bg-gradient-to-l from-indigo-900 to-indigo-950 dark:bg-gradient-to-r dark:from-blue-950 dark:to-indigo-950 transition duration-100'

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
      icon: FolderOpenIcon,
      current: router.pathname.startsWith('/folders'),
    },
    {
      name: 'Access Keys',
      href: '/access-keys',
      icon: KeyIcon,
      current: router.pathname.startsWith('/access-keys'),
    },
  ]

  return (
    <div
      className={clsx(
        hideSidebar && 'max-w-0 overflow-hidden opacity-0',
        'hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-20 lg:overflow-y-auto lg:pb-4',
        SIDEBAR_COLOR,
      )}
    >
      <div className="flex flex-col h-full">
        <div className="flex h-16 shrink-0 items-center justify-center">
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
        </div>
        {authContext.viewer && (
          <div className="flex flex-col flex-1">
            <nav className="mt-8">
              <ul className="flex flex-col items-center space-y-1">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={clsx(
                        item.current
                          ? 'bg-white/10 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-white/10',
                        'group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-semibold',
                      )}
                    >
                      <item.icon
                        className="h-6 w-6 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="sr-only">{item.name}</span>
                    </Link>
                  </li>
                ))}
                {menuItems.map((item, i) => (
                  <li key={i}>
                    <Link
                      href={item.href}
                      className={clsx(
                        router.pathname.startsWith(item.href)
                          ? 'bg-white/10 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-white/10',
                        'group flex gap-x-3 rounded-md p-1 text-sm leading-6 font-semibold',
                      )}
                    >
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
                      <span className="sr-only">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="flex-1 flex flex-col items-center justify-end">
              <ul className="flex flex-col gap-6 pb-4">
                <li>
                  <ul className="flex flex-col gap-2 pb-4">
                    {authContext.viewer.isAdmin && (
                      <li>
                        <Link
                          href={'/server'}
                          className={clsx(
                            router.pathname.startsWith('/server')
                              ? 'bg-white/10 text-white'
                              : 'text-gray-400 hover:text-white hover:bg-white/10',
                            'group flex gap-x-3 rounded-full p-3 text-sm leading-6 font-semibold',
                          )}
                        >
                          <ServerStackIcon
                            className="h-6 w-6 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="sr-only">Server</span>
                        </Link>
                      </li>
                    )}
                    <li>
                      <Link
                        href={'/profile'}
                        className={clsx(
                          router.pathname.startsWith('/profile')
                            ? 'bg-white/10 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-white/10',
                          'group flex gap-x-3 rounded-full p-3 text-sm leading-6 font-semibold',
                        )}
                      >
                        <UserIcon
                          className="h-6 w-6 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="sr-only">Profile</span>
                      </Link>
                    </li>
                  </ul>
                </li>
                <li>
                  <div className="flex flex-col items-center">
                    <ThemeSwitch />
                  </div>
                </li>
                {authContext.authState.isAuthenticated && (
                  <li>
                    <div className="flex justify-center">
                      <button onClick={authContext.logout}>
                        <Icon
                          size="md"
                          icon={ArrowRightEndOnRectangleIcon}
                          className="text-gray-100 dark:text-gray-400 hover:text-gray-500"
                        />
                      </button>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
