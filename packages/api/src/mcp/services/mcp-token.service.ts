import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { and, desc, eq } from 'drizzle-orm'
import { sessionsTable } from 'src/auth/entities/session.entity'
import { hashedTokenHelper } from 'src/auth/utils/hashed-token-helper'
import { OrmService } from 'src/orm/orm.service'
import { v4 as uuidV4 } from 'uuid'

@Injectable()
export class McpTokenService {
  constructor(private readonly ormService: OrmService) {}

  async createMcpToken(
    userId: string,
    clientName: string,
  ): Promise<{
    tokenId: string
    rawToken: string
    clientName: string
    createdAt: Date
  }> {
    const secret = hashedTokenHelper.createSecretKey()
    const now = new Date()
    const sessionId = uuidV4()

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const session = (
      await this.ormService.db
        .insert(sessionsTable)
        .values({
          id: sessionId,
          userId,
          hash: hashedTokenHelper.createHash(secret),
          type: 'mcp_token',
          typeDetails: {
            clientName,
            lastUsedAt: null,
          },
          expiresAt: new Date('9999-12-31'),
          createdAt: now,
          updatedAt: now,
        })
        .returning()
    )[0]!

    const rawToken = hashedTokenHelper.encode(session.id, secret)

    return {
      tokenId: session.id,
      rawToken,
      clientName,
      createdAt: session.createdAt,
    }
  }

  async listMcpTokens(userId: string): Promise<
    {
      id: string
      clientName: string
      createdAt: Date
      lastUsedAt: string | null
    }[]
  > {
    const sessions = await this.ormService.db
      .select()
      .from(sessionsTable)
      .where(
        and(
          eq(sessionsTable.userId, userId),
          eq(sessionsTable.type, 'mcp_token'),
        ),
      )
      .orderBy(desc(sessionsTable.createdAt))

    return sessions.map((session) => ({
      id: session.id,
      clientName: String(session.typeDetails?.['clientName'] ?? ''),
      createdAt: session.createdAt,
      lastUsedAt:
        session.typeDetails?.['lastUsedAt'] != null
          ? String(session.typeDetails['lastUsedAt'])
          : null,
    }))
  }

  async revokeMcpToken(userId: string, tokenId: string): Promise<void> {
    const deleted = await this.ormService.db
      .delete(sessionsTable)
      .where(
        and(
          eq(sessionsTable.id, tokenId),
          eq(sessionsTable.userId, userId),
          eq(sessionsTable.type, 'mcp_token'),
        ),
      )
      .returning()

    if (deleted.length === 0) {
      throw new NotFoundException('MCP token not found')
    }
  }

  async validateMcpToken(rawToken: string): Promise<{
    id: string
    userId: string
    clientName: string
  }> {
    const [id, secret] = hashedTokenHelper.decodeRefreshToken(rawToken)

    const session = await this.ormService.db.query.sessionsTable.findFirst({
      where: and(
        eq(sessionsTable.id, id),
        eq(sessionsTable.hash, hashedTokenHelper.createHash(secret)),
        eq(sessionsTable.type, 'mcp_token'),
      ),
    })

    if (!session) {
      throw new UnauthorizedException('Invalid MCP token')
    }

    // Update lastUsedAt without awaiting to avoid blocking
    void this.ormService.db
      .update(sessionsTable)
      .set({
        typeDetails: {
          ...session.typeDetails,
          lastUsedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(sessionsTable.id, session.id))

    return {
      id: session.id,
      userId: session.userId,
      clientName: String(session.typeDetails?.['clientName'] ?? ''),
    }
  }
}
