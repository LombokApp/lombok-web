import type * as r from 'runtypes'

import { EnumType } from '../../../util/types.util'

export enum UserStatus {
  /**
   * Accounts have a pending status when they have never been authenticated
   */
  Pending = 'PENDING',
  /**
   * Accounts have an active status when they have been authenticated at least once
   */
  Active = 'ACTIVE',
}

export const UserStatusType: r.Runtype<UserStatus> = EnumType(UserStatus)
