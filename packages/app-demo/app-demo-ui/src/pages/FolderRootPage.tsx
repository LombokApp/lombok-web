import { useLocation, useParams, useSearchParams } from 'react-router'

export const FolderRootPage = () => {
  const params = useParams()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const pathParts = params['*']?.split('/') ?? []
  const folderViewType = pathParts[0]

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-white shadow-xl backdrop-blur-sm">
        <h1 className="mb-2 text-3xl font-bold">
          {folderViewType
            .split('-')
            .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
            .join(' ')}
        </h1>
        <p className="text-white/70">
          Path: {pathname}
          {`${searchParams.size > 0 ? '?' : ''}${searchParams.toString()}`}
        </p>
      </div>
    </div>
  )
}
