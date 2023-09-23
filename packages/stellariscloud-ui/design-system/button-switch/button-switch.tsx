import clsx from 'clsx'

export function ButtonSwitch<K extends string>({
  onToggle,
  selectedKey,
  keys,
  icons,
}: {
  keys: [K, K]
  icons?: [React.ReactNode, React.ReactNode]
  selectedKey: K
  onToggle: (key: K) => void
}) {
  return (
    <div
      className="flex space-x-1 rounded-lg bg-slate-200 dark:bg-slate-800 p-0.5"
      role="tablist"
      aria-orientation="horizontal"
    >
      <button
        className={clsx(
          'transition duration-100 flex items-center rounded-md py-[0.4375rem] pl-2 pr-2 text-sm font-semibold lg:pr-3',
          selectedKey === keys[0] && 'bg-white dark:bg-slate-900 shadow',
        )}
        id="headlessui-tabs-tab-208"
        role="tab"
        type="button"
        aria-selected={selectedKey === keys[0] ? 'true' : 'false'}
        tabIndex={0}
        data-headlessui-state={selectedKey === keys[0] ? 'selected' : ''}
        aria-controls="headlessui-tabs-panel-210"
        onClick={() =>
          selectedKey === keys[1] ? onToggle(keys[0]) : undefined
        }
      >
        {icons?.[0]}
        <span className="sr-only lg:not-sr-only lg:ml-2 text-slate-900 dark:text-white">
          {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
          <span className="capitalize">{keys?.[0]}</span>
        </span>
      </button>
      <button
        className={clsx(
          'transition duration-100 flex items-center rounded-md py-[0.4375rem] pl-2 pr-2 text-sm font-semibold lg:pr-3',
          selectedKey === keys[1] && 'bg-white dark:bg-slate-900 shadow',
        )}
        id="headlessui-tabs-tab-209"
        role="tab"
        type="button"
        aria-selected={selectedKey === keys[1] ? 'true' : 'false'}
        tabIndex={-1}
        data-headlessui-state={selectedKey === keys[1] ? 'selected' : ''}
        aria-controls="headlessui-tabs-panel-211"
        onClick={() =>
          selectedKey === keys[0] ? onToggle(keys[1]) : undefined
        }
      >
        {icons?.[1]}
        <span className="sr-only lg:not-sr-only lg:ml-2 text-slate-900 dark:text-white">
          {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
          <span className="capitalize">{keys?.[1]}</span>
        </span>
      </button>
    </div>
  )
}
