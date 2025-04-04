import { SetMetadata } from '@nestjs/common'
export const AUTH_GUARD_CONFIG_KEY = 'AUTH_GUARD_CONFIG'

export enum AllowedActor {
  USER = 'user',
  APP_USER = 'app_user',
}

export const AuthGuardConfig = (config: { allowedActors: AllowedActor[] }) =>
  SetMetadata(AUTH_GUARD_CONFIG_KEY, config)
