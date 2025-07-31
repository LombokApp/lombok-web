import { Reflector } from '@nestjs/core'

export enum AllowedActor {
  USER = 'user',
  APP_USER = 'app_user',
}

export const AuthGuardConfig = Reflector.createDecorator<{
  allowedActors: AllowedActor[]
}>()
