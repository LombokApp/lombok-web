import type { paths } from '@lombokapp/types'

export type PublicSettingsGetResponse =
  paths['/api/v1/public/settings']['get']['responses']['200']['content']['application/json']
export type PublicSettingsDTO = PublicSettingsGetResponse['settings']

export interface IPublicSettingsContext {
  settings: PublicSettingsDTO | null
  isLoading: boolean
  refetch: () => void
}
