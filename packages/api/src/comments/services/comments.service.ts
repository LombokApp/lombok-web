import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, asc, desc, eq, isNull, or } from 'drizzle-orm'
import { folderObjectsTable } from 'src/folders/entities/folder-object.entity'
import { FolderObjectNotFoundException } from 'src/folders/exceptions/folder-object-not-found.exception'
import { FolderService } from 'src/folders/services/folder.service'
import { OrmService } from 'src/orm/orm.service'
import type { User } from 'src/users/entities/user.entity'
import { usersTable } from 'src/users/entities/user.entity'

import {
  type Comment,
  CommentAnchor,
  CommentAuthor,
  commentsTable,
} from '../entities/comment.entity'
import { commentMentionsTable } from '../entities/comment-mention.entity'
import { CommentMentionService } from './comment-mention.service'
import { CommentReactionService } from './comment-reaction.service'
import { CommentValidationService } from './comment-validation.service'

@Injectable()
export class CommentsService {
  constructor(
    private readonly ormService: OrmService,
    private readonly validationService: CommentValidationService,
    private readonly folderService: FolderService,
    private readonly mentionService: CommentMentionService,
    private readonly reactionService: CommentReactionService,
  ) {}

  async createCommentAsUser(
    actor: User,
    folderId: string,
    folderObjectId: string,
    content: string,
    anchor?: CommentAnchor,
    quoteId?: string,
    rootCommentId?: string,
  ): Promise<Comment> {
    let finalFolderId = folderId
    let finalFolderObjectId = folderObjectId
    let finalRootId: string | null = null

    // If rootCommentId is provided, validate it and get folder/object info from it
    if (rootCommentId) {
      const rootCommentResult = await this.ormService.db
        .select()
        .from(commentsTable)
        .where(eq(commentsTable.id, rootCommentId))
        .limit(1)

      const rootComment = rootCommentResult[0]
      if (!rootComment) {
        throw new NotFoundException(
          `Comment with id ${rootCommentId} not found`,
        )
      }

      // Verify it's actually a root comment
      if (rootComment.rootId !== null) {
        throw new BadRequestException(
          `Comment ${rootCommentId} is not a root comment`,
        )
      }

      // Verify root comment has an anchor (required for anchored threads)
      if (!rootComment.anchor) {
        throw new BadRequestException(
          'Cannot create comment in thread - root comment must have an anchor',
        )
      }

      // Use folder/object info from root comment
      finalFolderId = rootComment.folderId
      finalFolderObjectId = rootComment.folderObjectId
      finalRootId = rootCommentId

      // Check folder access
      await this.folderService.getFolderAsUser(actor, finalFolderId)

      // Validate quoteId if provided (for comments in anchored threads)
      if (quoteId) {
        const quotedCommentResult = await this.ormService.db
          .select()
          .from(commentsTable)
          .where(eq(commentsTable.id, quoteId))
          .limit(1)

        const quotedComment = quotedCommentResult[0]
        if (!quotedComment) {
          throw new NotFoundException(
            `Quoted comment with id ${quoteId} not found`,
          )
        }

        // Validate quote is in same thread
        // If quoting the root comment itself, quotedComment.rootId is null and quoteId === rootCommentId
        // If quoting another comment in thread, quotedComment.rootId should equal rootCommentId
        if (quotedComment.rootId === null) {
          // Quoting the root comment - must be the same root comment
          if (quoteId !== rootCommentId) {
            throw new BadRequestException(
              'Quote must reference a comment in the same thread',
            )
          }
        } else {
          // Quoting another comment in thread - must be in the same thread
          this.validationService.validateQuoteInSameThread(
            quotedComment.rootId,
            rootCommentId,
          )
        }
      }
    } else {
      // Creating a root comment - check folder access and validate folder object
      await this.folderService.getFolderAsUser(actor, folderId)

      // Validate folder object exists
      const folderObjectResult = await this.ormService.db
        .select()
        .from(folderObjectsTable)
        .where(eq(folderObjectsTable.id, folderObjectId))
        .limit(1)

      const folderObject = folderObjectResult[0]
      if (!folderObject) {
        throw new FolderObjectNotFoundException(folderId, '')
      }

      // Verify folder_id matches
      if (folderObject.folderId !== folderId) {
        throw new NotFoundException(
          `Folder object ${folderObjectId} does not belong to folder ${folderId}`,
        )
      }

      // Validate anchor if provided
      if (anchor) {
        this.validationService.validateRootCommentAnchor(anchor)
      }

      // Validate quoteId if provided (for root comments)
      if (quoteId) {
        const quotedCommentResult = await this.ormService.db
          .select()
          .from(commentsTable)
          .where(eq(commentsTable.id, quoteId))
          .limit(1)

        const quotedComment = quotedCommentResult[0]
        if (!quotedComment) {
          throw new NotFoundException(
            `Quoted comment with id ${quoteId} not found`,
          )
        }

        // Verify quoted comment belongs to the same folder object
        if (quotedComment.folderObjectId !== folderObjectId) {
          throw new BadRequestException(
            'Quote must reference a comment on the same folder object',
          )
        }

        // Verify quoted comment is also a root comment (part of the same stream)
        if (quotedComment.rootId !== null) {
          throw new BadRequestException(
            'Quote must reference a root comment (not a comment in an anchored thread)',
          )
        }
      }
    }

    // Create comment
    const result = await this.ormService.db
      .insert(commentsTable)
      .values({
        folderId: finalFolderId,
        folderObjectId: finalFolderObjectId,
        authorId: actor.id,
        content,
        anchor: rootCommentId ? null : (anchor ?? null), // Only root comments can have anchors
        rootId: finalRootId,
        quoteId: quoteId ?? null,
      })
      .returning()

    const createdComment = result[0]
    if (!createdComment) {
      throw new Error('Failed to create comment')
    }

    // Process mentions from content
    await this.mentionService.processMentions(createdComment.id, content)

    return createdComment
  }

  async listRootCommentsAsUser(
    actor: User,
    folderObjectId: string,
  ): Promise<(Comment & { author: CommentAuthor })[]> {
    // Get folder object to check access
    const folderObjectResult = await this.ormService.db
      .select()
      .from(folderObjectsTable)
      .where(eq(folderObjectsTable.id, folderObjectId))
      .limit(1)

    const folderObject = folderObjectResult[0]
    if (!folderObject) {
      throw new NotFoundException(
        `Folder object with id ${folderObjectId} not found`,
      )
    }

    // Check folder access
    await this.folderService.getFolderAsUser(actor, folderObject.folderId)

    return this.ormService.db
      .select({
        comment: commentsTable,
        author: {
          id: usersTable.id,
          username: usersTable.username,
          name: usersTable.name,
          email: usersTable.email,
        },
      })
      .from(commentsTable)
      .innerJoin(usersTable, eq(commentsTable.authorId, usersTable.id))
      .where(
        and(
          eq(commentsTable.folderObjectId, folderObjectId),
          isNull(commentsTable.rootId),
          isNull(commentsTable.deletedAt),
        ),
      )
      .orderBy(desc(commentsTable.createdAt))
      .then((results) =>
        results.map((r) => ({ ...r.comment, author: r.author })),
      )
  }

  async listAllCommentsAsUser(
    actor: User,
    folderObjectId: string,
  ): Promise<
    (Comment & {
      author: CommentAuthor
      quotedComment?: Comment & { author: CommentAuthor }
    })[]
  > {
    // Get folder object to check access
    const folderObjectResult = await this.ormService.db
      .select()
      .from(folderObjectsTable)
      .where(eq(folderObjectsTable.id, folderObjectId))
      .limit(1)

    const folderObject = folderObjectResult[0]
    if (!folderObject) {
      throw new NotFoundException(
        `Folder object with id ${folderObjectId} not found`,
      )
    }

    // Check folder access
    await this.folderService.getFolderAsUser(actor, folderObject.folderId)

    // Get all comments for this folder object (root and replies)
    const allCommentsResult = await this.ormService.db
      .select({
        comment: commentsTable,
        author: {
          id: usersTable.id,
          username: usersTable.username,
          name: usersTable.name,
          email: usersTable.email,
        },
      })
      .from(commentsTable)
      .innerJoin(usersTable, eq(commentsTable.authorId, usersTable.id))
      .where(
        and(
          eq(commentsTable.folderObjectId, folderObjectId),
          isNull(commentsTable.deletedAt),
        ),
      )
      .orderBy(asc(commentsTable.createdAt))

    // Build a map of all comments for quick lookup of quoted comments
    const commentsMap = new Map<string, Comment & { author: CommentAuthor }>()
    for (const row of allCommentsResult) {
      commentsMap.set(row.comment.id, {
        ...row.comment,
        author: row.author,
      })
    }

    // Combine results, looking up quoted comments
    return allCommentsResult.map((r) => {
      const quotedCommentId = r.comment.quoteId
      const quotedComment =
        quotedCommentId && commentsMap.has(quotedCommentId)
          ? commentsMap.get(quotedCommentId)
          : undefined

      return {
        ...r.comment,
        author: r.author,
        quotedComment,
      }
    })
  }

  async getThreadAsUser(
    actor: User,
    rootCommentId: string,
  ): Promise<
    (Comment & {
      author: User
      quotedComment?: Comment & { author: User }
    })[]
  > {
    // Fetch root comment to get folder ID
    const rootCommentResult = await this.ormService.db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.id, rootCommentId))
      .limit(1)

    const rootComment = rootCommentResult[0]
    if (!rootComment) {
      throw new NotFoundException(
        `Root comment with id ${rootCommentId} not found`,
      )
    }

    // Check folder access
    await this.folderService.getFolderAsUser(actor, rootComment.folderId)

    // Get all comments in the thread (quoted comments are guaranteed to be in the same thread)
    const threadCommentsResult = await this.ormService.db
      .select({
        comment: commentsTable,
        author: usersTable,
      })
      .from(commentsTable)
      .innerJoin(usersTable, eq(commentsTable.authorId, usersTable.id))
      .where(
        and(
          or(
            eq(commentsTable.id, rootCommentId),
            eq(commentsTable.rootId, rootCommentId),
          ),
          isNull(commentsTable.deletedAt),
        ),
      )
      .orderBy(asc(commentsTable.createdAt))

    // Build a map of all comments in the thread for quick lookup
    const commentsMap = new Map<string, Comment & { author: User }>()
    for (const row of threadCommentsResult) {
      commentsMap.set(row.comment.id, {
        ...row.comment,
        author: row.author,
      })
    }

    // Combine results, looking up quoted comments from the same thread
    return threadCommentsResult.map((r) => {
      const quotedCommentId = r.comment.quoteId
      const quotedComment =
        quotedCommentId && commentsMap.has(quotedCommentId)
          ? commentsMap.get(quotedCommentId)
          : undefined

      return {
        ...r.comment,
        author: r.author,
        quotedComment,
      }
    })
  }

  async deleteCommentAsUser(
    actor: User,
    folderId: string,
    commentId: string,
  ): Promise<void> {
    // Check folder access first (before fetching comment)
    await this.folderService.getFolderAsUser(actor, folderId)

    // Fetch comment to verify it exists and belongs to the folder
    const commentResult = await this.ormService.db
      .select()
      .from(commentsTable)
      .where(
        and(
          eq(commentsTable.id, commentId),
          eq(commentsTable.folderId, folderId),
        ),
      )
      .limit(1)

    const comment = commentResult[0]
    if (!comment) {
      throw new NotFoundException('Comment not found')
    }

    // Verify author owns the comment
    if (comment.authorId !== actor.id) {
      throw new NotFoundException('Comment not found or unauthorized')
    }

    // Soft delete (tombstone)
    await this.ormService.db
      .update(commentsTable)
      .set({ deletedAt: new Date() })
      .where(eq(commentsTable.id, commentId))
  }

  /**
   * Get mentions for a comment
   */
  async getMentionsForCommentAsUser(
    actor: User,
    folderId: string,
    folderObjectId: string,
    commentId: string,
  ): Promise<{ id: string; username: string; name: string | null }[]> {
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

    const mentions = await this.ormService.db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        name: usersTable.name,
      })
      .from(commentMentionsTable)
      .innerJoin(usersTable, eq(commentMentionsTable.userId, usersTable.id))
      .where(eq(commentMentionsTable.commentId, commentId))

    return mentions
  }

  /**
   * Get reactions for a comment
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
    return this.reactionService.getReactionsForCommentAsUser(
      actor,
      folderId,
      folderObjectId,
      commentId,
    )
  }
}
