import { Link } from 'react-router-dom'

interface TableLinkColumnProps {
  to: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}

export function TableLinkColumn({ to, onClick }: TableLinkColumnProps) {
  return (
    <div className="size-0 max-w-0 overflow-hidden">
      <Link to={to} onClick={onClick} className="absolute inset-0" />
    </div>
  )
}
