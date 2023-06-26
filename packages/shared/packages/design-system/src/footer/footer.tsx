import type { ReactNode } from 'react'

import { NavLink } from '../'
interface FooterProps {
  navItems: { href: string; text: string }[]
  logo?: ReactNode
}

export function Footer({ navItems, logo }: FooterProps) {
  return (
    <footer className="text-white bg-black full-bleed">
      <div className="flex flex-col items-center justify-between py-10 m-auto md:py-16 md:items-start md:flex-row content-area-width">
        <div className="flex flex-col items-center md:flex-row gap-10 md:gap-32 md:items-start">
          {logo ? logo : undefined}
          <div>
            <ul className="flex flex-col items-center md:items-start gap-6">
              {navItems.map(({ href, text }) => (
                <li key={href + text}>
                  <NavLink href={href}>{text}</NavLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}
