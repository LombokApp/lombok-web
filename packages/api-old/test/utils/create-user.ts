import { container } from 'tsyringe'

import { usersTable } from '../../src/domains/user/entities/user.entity'
import { OrmService } from '../../src/orm/orm.service'
import { authApi } from '../support/api-client'

const ormService = container.resolve(OrmService)

export const createUser = async ({
  username,
  email,
  password,
  isAdmin = false,
}: {
  username: string
  email: string
  password: string
  isAdmin?: boolean
}) => {
  const response = await authApi().signup({
    signupParams: {
      username,
      email,
      password,
    },
  })

  await ormService.db.update(usersTable).set({ emailVerified: true, isAdmin })
  return response
}
