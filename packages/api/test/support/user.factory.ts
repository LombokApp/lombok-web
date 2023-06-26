import { UserStatus } from '../../src/domains/user/constants/user.constants'

export const userFactory = (data?: any) => {
  return {
    status: UserStatus.Active,
    ...data,
  }
}
