import type { ApiKey } from './entities/api-key.entity'
import type { Session } from './entities/session.entity'
import type { AccessTokenJWT } from './services/auth-token.service'

export type Credential = string | AccessTokenJWT | ApiKey | Session
