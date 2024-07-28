import { SetMetadata } from '@nestjs/common'
export const AUTH_GUARD_CONFIG_KEY = 'AUTH_GUARD_CONFIG'

export enum AllowedActor {
  USER = 'USER',
  APP_USER = 'APP_USER',
}

export const AuthGuardConfig = (config: { allowedActors: AllowedActor[] }) =>
  SetMetadata(AUTH_GUARD_CONFIG_KEY, config)
