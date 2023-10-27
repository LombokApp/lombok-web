import { isNull, sql } from 'drizzle-orm'
import { Lifecycle, scoped } from 'tsyringe'
import { v4 as uuidV4 } from 'uuid'

import { UnauthorizedError } from '../../../errors/auth.error'
import { OrmService } from '../../../orm/orm.service'
import { parseSort } from '../../../util/sort.util'
import type { Actor } from '../../auth/actor'
import { PlatformRole } from '../../auth/constants/role.constants'
import { JWTService } from '../../auth/services/jwt.service'
import { hashedTokenHelper } from '../../auth/utils/hashed-token-helper'
import type {
  FolderWorkerKey,
  NewFolderWorkerKey,
} from '../entities/folder-worker-key.entity'
import { folderWorkerKeysTable } from '../entities/folder-worker-key.entity'

export enum FolderWorkerSort {
  CreatedAtAsc = 'createdAt-asc',
  CreatedAtDesc = 'createdAt-desc',
  UpdatedAtAsc = 'updatedAt-asc',
  UpdatedAtDesc = 'updatedAt-desc',
}

export enum FolderWorkerKeySort {
  CreatedAtAsc = 'createdAt-asc',
  CreatedAtDesc = 'createdAt-desc',
  UpdatedAtAsc = 'updatedAt-asc',
  UpdatedAtDesc = 'updatedAt-desc',
}

@scoped(Lifecycle.ContainerScoped)
export class FolderWorkerService {
  constructor(
    private readonly ormService: OrmService,
    private readonly jwtService: JWTService,
  ) {}

  async createServerWorkerKeyAsAdmin(actor: Actor) {
    if (actor.role !== PlatformRole.Admin) {
      throw new UnauthorizedError()
    }

    const now = new Date()
    const secret = hashedTokenHelper.createSecretKey()
    const workerId = uuidV4()
    const token = this.jwtService.createWorkerAccessTokenFromWorker(workerId)
    const parsedToken = this.jwtService.verifyJWT(token)
    const newWorkerKey: NewFolderWorkerKey = {
      id: workerId,
      createdAt: now,
      updatedAt: now,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      accessTokenExpiresAt: new Date(parsedToken.exp! * 1000),
      hash: hashedTokenHelper.createHash(secret),
    }

    const workerKey = (
      await this.ormService.db
        .insert(folderWorkerKeysTable)
        .values(newWorkerKey)
        .returning()
    )[0]

    return { workerKey, token }
  }

  async listServerWorkerKeysAsAdmin(
    actor: Actor,
    {
      offset = 0,
      limit = 25,
      sort = FolderWorkerKeySort.CreatedAtAsc,
    }: {
      offset?: number
      limit?: number
      sort?: FolderWorkerKeySort
    },
  ) {
    if (actor.role !== PlatformRole.Admin) {
      throw new UnauthorizedError()
    }

    const folderWorkerKeys: FolderWorkerKey[] =
      await this.ormService.db.query.folderWorkerKeysTable.findMany({
        where: isNull(folderWorkerKeysTable.ownerId),
        offset,
        limit,
        orderBy: parseSort(folderWorkerKeysTable, sort),
      })
    const [folderWorkerKeysCount] = await this.ormService.db
      .select({ count: sql<string | null>`count(*)` })
      .from(folderWorkerKeysTable)

    return {
      result: folderWorkerKeys,
      meta: { totalCount: parseInt(folderWorkerKeysCount.count ?? '0', 10) },
    }
  }
}
