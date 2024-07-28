import type { User } from './users/entities/user.entity'

declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}
