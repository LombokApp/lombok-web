import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { FolderService } from 'src/folders/services/folder.service'
import { OrmService } from 'src/orm/orm.service'
import type { User } from 'src/users/entities/user.entity'
import { usersTable } from 'src/users/entities/user.entity'

import { commentsTable } from '../entities/comment.entity'
import {
  type CommentReaction,
  commentReactionsTable,
} from '../entities/comment-reaction.entity'

@Injectable()
export class CommentReactionService {
  constructor(
    private readonly ormService: OrmService,
    private readonly folderService: FolderService,
  ) {}

  /**
   * Add a reaction to a comment
   */
  async addReactionAsUser(
    actor: User,
    folderId: string,
    folderObjectId: string,
    commentId: string,
    emoji: string,
  ): Promise<CommentReaction> {
    // Check folder access first (ACL)
    await this.folderService.getFolderAsUser(actor, folderId)

    // Validate comment exists and belongs to the folder/object
    const comment = await this.ormService.db
      .select()
      .from(commentsTable)
      .where(
        and(
          eq(commentsTable.id, commentId),
          eq(commentsTable.folderId, folderId),
          eq(commentsTable.folderObjectId, folderObjectId),
        ),
      )
      .limit(1)

    if (!comment[0]) {
      throw new NotFoundException(`Comment with id ${commentId} not found`)
    }

    // Validate emoji (basic check - should be a single emoji character or short string)
    if (!emoji || emoji.trim().length === 0) {
      throw new BadRequestException('Emoji cannot be empty')
    }

    // Insert reaction (onConflictDoNothing handles duplicate reactions)
    const result = await this.ormService.db
      .insert(commentReactionsTable)
      .values({
        commentId,
        userId: actor.id,
        emoji: emoji.trim(),
      })
      .onConflictDoNothing()
      .returning()

    // If no row was inserted (duplicate), fetch existing reaction
    if (result.length === 0) {
      const existing = await this.ormService.db
        .select()
        .from(commentReactionsTable)
        .where(
          and(
            eq(commentReactionsTable.commentId, commentId),
            eq(commentReactionsTable.userId, actor.id),
            eq(commentReactionsTable.emoji, emoji.trim()),
          ),
        )
        .limit(1)

      const existingReaction = existing[0]
      if (!existingReaction) {
        throw new Error('Failed to create or find reaction')
      }

      return existingReaction
    }

    const createdReaction = result[0]
    if (!createdReaction) {
      throw new Error('Failed to create reaction')
    }

    return createdReaction
  }

  /**
   * Remove a reaction from a comment
   */
  async removeReactionAsUser(
    actor: User,
    folderId: string,
    folderObjectId: string,
    commentId: string,
    emoji: string,
  ): Promise<void> {
    // Check folder access first (ACL)
    await this.folderService.getFolderAsUser(actor, folderId)

    // Validate comment exists and belongs to the folder/object
    const comment = await this.ormService.db
      .select()
      .from(commentsTable)
      .where(
        and(
          eq(commentsTable.id, commentId),
          eq(commentsTable.folderId, folderId),
          eq(commentsTable.folderObjectId, folderObjectId),
        ),
      )
      .limit(1)

    if (!comment[0]) {
      throw new NotFoundException(`Comment with id ${commentId} not found`)
    }

    // Decode URL-encoded emoji (e.g., %F0%9F%99%8F -> 👏)
    // The frontend encodes emojis when passing them in URL path parameters
    const decodedEmoji = decodeURIComponent(emoji).trim()

    await this.ormService.db
      .delete(commentReactionsTable)
      .where(
        and(
          eq(commentReactionsTable.commentId, commentId),
          eq(commentReactionsTable.userId, actor.id),
          eq(commentReactionsTable.emoji, decodedEmoji),
        ),
      )
  }

  /**
   * Get all reactions for a comment grouped by emoji
   */
  async getReactionsForCommentAsUser(
    actor: User,
    folderId: string,
    folderObjectId: string,
    commentId: string,
  ): Promise<
    {
      emoji: string
      count: number
      users: {
        id: string
        username: string
        name: string | null
        email: string | null
      }[]
    }[]
  > {
    // Check folder access first (ACL)
    await this.folderService.getFolderAsUser(actor, folderId)

    // Validate comment exists and belongs to the folder/object
    const comment = await this.ormService.db
      .select()
      .from(commentsTable)
      .where(
        and(
          eq(commentsTable.id, commentId),
          eq(commentsTable.folderId, folderId),
          eq(commentsTable.folderObjectId, folderObjectId),
        ),
      )
      .limit(1)

    if (!comment[0]) {
      throw new NotFoundException(`Comment with id ${commentId} not found`)
    }

    const reactions = await this.ormService.db
      .select({
        emoji: commentReactionsTable.emoji,
        userId: commentReactionsTable.userId,
        username: usersTable.username,
        name: usersTable.name,
        email: usersTable.email,
      })
      .from(commentReactionsTable)
      .innerJoin(usersTable, eq(usersTable.id, commentReactionsTable.userId))
      .where(eq(commentReactionsTable.commentId, commentId))
      .orderBy(commentReactionsTable.createdAt)

    // Group by emoji
    const grouped = new Map<
      string,
      {
        id: string
        username: string
        name: string | null
        email: string | null
      }[]
    >()

    for (const reaction of reactions) {
      if (!grouped.has(reaction.emoji)) {
        grouped.set(reaction.emoji, [])
      }
      grouped.get(reaction.emoji)?.push({
        id: reaction.userId,
        username: reaction.username,
        name: reaction.name,
        email: reaction.email,
      })
    }

    return Array.from(grouped.entries()).map(([emoji, users]) => ({
      emoji,
      count: users.length,
      users,
    }))
  }
}
