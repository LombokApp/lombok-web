import { and, eq, isNull, sql } from 'drizzle-orm'
import { Lifecycle, scoped } from 'tsyringe'
import { v4 as uuidV4 } from 'uuid'

import { UnauthorizedError } from '../../../errors/auth.error'
import { OrmService } from '../../../orm/orm.service'
import { parseSort } from '../../../util/sort.util'
import type { Actor } from '../../auth/actor'
import { PlatformRole } from '../../auth/constants/role.constants'
import { JWTService } from '../../auth/services/jwt.service'
import { hashedTokenHelper } from '../../auth/utils/hashed-token-helper'
import { folderWorkersTable } from '../entities/folder-worker.entity'
import type {
  FolderWorkerKey,
  NewFolderWorkerKey,
} from '../entities/folder-worker-key.entity'
import { folderWorkerKeysTable } from '../entities/folder-worker-key.entity'
import { FolderWorkerKeyNotFoundError } from '../errors/folder-worker-key.error'

export enum FolderWorkerSort {
  CreatedAtAsc = 'createdAt-asc',
  CreatedAtDesc = 'createdAt-desc',
  UpdatedAtAsc = 'updatedAt-asc',
  UpdatedAtDesc = 'updatedAt-desc',
  LastSeenAsc = 'lastSeen-asc',
  LastSeenDesc = 'lastSeen-desc',
  FirstSeenAsc = 'firstSeen-asc',
  FirstSeenDesc = 'firstSeen-desc',
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
    const token = this.jwtService.createWorkerAccessToken(workerId)
    const parsedToken = this.jwtService.verifyWorkerAccessToken(token)
    const newWorkerKey: NewFolderWorkerKey = {
      id: workerId,
      createdAt: now,
      updatedAt: now,
      accessTokenExpiresAt: new Date(parsedToken.exp * 1000),
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

  async deleteServerWorkerKeyAsAdmin(actor: Actor, workerKeyId: string) {
    if (actor.role !== PlatformRole.Admin) {
      throw new UnauthorizedError()
    }
    const workerKey =
      await this.ormService.db.query.folderWorkerKeysTable.findFirst({
        where: eq(folderWorkerKeysTable.id, workerKeyId),
      })

    if (!workerKey) {
      throw new FolderWorkerKeyNotFoundError()
    }

    await this.ormService.db
      .delete(folderWorkerKeysTable)
      .where(eq(folderWorkerKeysTable.id, workerKeyId))

    return true
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
      .where(isNull(folderWorkerKeysTable.ownerId))

    return {
      result: folderWorkerKeys,
      meta: { totalCount: parseInt(folderWorkerKeysCount.count ?? '0', 10) },
    }
  }

  async listServerWorkersAsAdmin(
    actor: Actor,
    {
      offset = 0,
      limit = 25,
      sort = FolderWorkerSort.CreatedAtAsc,
    }: {
      offset?: number
      limit?: number
      sort?: FolderWorkerSort
    },
  ) {
    if (actor.role !== PlatformRole.Admin) {
      throw new UnauthorizedError()
    }

    const folderWorkers = await this.ormService.db
      .select({
        id: folderWorkersTable.id,
        keyId: folderWorkersTable.keyId,
        capabilities: folderWorkersTable.capabilities,
        externalId: folderWorkersTable.externalId,
        firstSeen: folderWorkersTable.firstSeen,
        lastSeen: folderWorkersTable.lastSeen,
        ips: folderWorkersTable.ips,
        createdAt: folderWorkersTable.createdAt,
        updatedAt: folderWorkersTable.updatedAt,
        paused: folderWorkersTable.paused,
      })
      .from(folderWorkersTable)
      .orderBy(parseSort(folderWorkersTable, sort))
      .innerJoin(
        folderWorkerKeysTable,
        and(
          eq(folderWorkersTable.keyId, folderWorkerKeysTable.id),
          isNull(folderWorkerKeysTable.ownerId),
        ),
      )
      .offset(offset)
      .limit(limit)

    const [folderWorkersCount] = await this.ormService.db
      .select({ count: sql<string | null>`count(*)` })
      .from(folderWorkersTable)
      .innerJoin(
        folderWorkerKeysTable,
        and(
          eq(folderWorkersTable.keyId, folderWorkerKeysTable.id),
          isNull(folderWorkerKeysTable.ownerId),
        ),
      )

    return {
      result: folderWorkers,
      meta: { totalCount: parseInt(folderWorkersCount.count ?? '0', 10) },
    }
  }

  createSocketAuthenticationAsWorker(userId?: string) {
    return {
      token: this.jwtService.createWorkerSocketAccessToken(userId),
    }
  }
}
