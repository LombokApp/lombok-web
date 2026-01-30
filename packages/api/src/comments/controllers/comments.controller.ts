import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import express from 'express'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import {
  AllowedActor,
  AuthGuardConfig,
} from 'src/auth/guards/auth.guard-config'
import { ApiStandardErrorResponses } from 'src/shared/decorators/api-standard-error-responses.decorator'

import { AddReactionDTO } from '../dto/add-reaction.dto'
import { CreateCommentDTO } from '../dto/create-root-comment.dto'
import { AllCommentsListResponseDTO } from '../dto/responses/all-comments-list-response.dto'
import { CreateRootCommentResponseDTO } from '../dto/responses/create-root-comment-response.dto'
import { DeleteCommentResponseDTO } from '../dto/responses/delete-comment-response.dto'
import { ThreadResponseDTO } from '../dto/responses/thread-response.dto'
import { transformCommentToDTO } from '../dto/transforms/comment.transforms'
import { CommentReactionService } from '../services/comment-reaction.service'
import { CommentsService } from '../services/comments.service'

@Controller('/api/v1/folders')
@ApiTags('Comments')
@UseGuards(AuthGuard)
@UsePipes(ZodValidationPipe)
@ApiBearerAuth()
@ApiStandardErrorResponses()
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly reactionService: CommentReactionService,
  ) {}

  /**
   * List all comments for a folder object (root and replies).
   */
  @Get('/:folderId/objects/:folderObjectId/comments')
  @AuthGuardConfig({
    allowedActors: [AllowedActor.USER, AllowedActor.APP_USER],
  })
  @ApiOperation({ summary: 'List all comments for a folder object' })
  @ApiOkResponse({
    description: 'List of all comments',
    type: AllCommentsListResponseDTO,
  })
  async listAllComments(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Param('folderObjectId', ParseUUIDPipe) folderObjectId: string,
  ): Promise<AllCommentsListResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const user = req.user
    const comments = await this.commentsService.listAllCommentsAsUser(
      req.user,
      folderObjectId,
    )

    // Fetch mentions and reactions for all comments
    const commentsWithData = await Promise.all(
      comments.map(async (comment) => {
        const [mentions, reactions] = await Promise.all([
          this.commentsService.getMentionsForCommentAsUser(
            user,
            folderId,
            folderObjectId,
            comment.id,
          ),
          this.commentsService.getReactionsForCommentAsUser(
            user,
            folderId,
            folderObjectId,
            comment.id,
          ),
        ])

        return transformCommentToDTO({
          ...comment,
          author: comment.author,
          quotedComment: comment.quotedComment
            ? {
                ...comment.quotedComment,
                author: comment.quotedComment.author,
              }
            : undefined,
          mentions,
          reactions,
        })
      }),
    )

    return {
      comments: commentsWithData,
    }
  }

  /**
   * Create a comment on a folder object.
   * If rootCommentId is provided, creates a comment in an anchored thread.
   * Otherwise, creates a root comment (top-level comment in the main/default thread).
   */
  @Post('/:folderId/objects/:folderObjectId/comments')
  @AuthGuardConfig({
    allowedActors: [AllowedActor.USER, AllowedActor.APP_USER],
  })
  @ApiOperation({ summary: 'Create a comment' })
  @ApiCreatedResponse({
    description: 'Comment created',
    type: CreateRootCommentResponseDTO,
  })
  async createComment(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Param('folderObjectId', ParseUUIDPipe) folderObjectId: string,
    @Body() dto: CreateCommentDTO,
  ): Promise<CreateRootCommentResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }

    const comment = await this.commentsService.createCommentAsUser(
      req.user,
      folderId,
      folderObjectId,
      dto.content,
      dto.anchor ?? undefined,
      dto.quoteId ?? undefined,
      dto.rootCommentId ?? undefined,
    )

    // Fetch with author for response
    // If it's a comment in an anchored thread, fetch the thread
    // Otherwise, fetch root comments
    if (dto.rootCommentId) {
      const thread = await this.commentsService.getThreadAsUser(
        req.user,
        dto.rootCommentId,
      )
      const createdComment = thread.find((c) => c.id === comment.id)

      if (!createdComment) {
        throw new Error('Failed to fetch created comment')
      }

      // Fetch mentions and reactions for the created comment
      const [mentions, reactions] = await Promise.all([
        this.commentsService.getMentionsForCommentAsUser(
          req.user,
          folderId,
          folderObjectId,
          createdComment.id,
        ),
        this.commentsService.getReactionsForCommentAsUser(
          req.user,
          folderId,
          folderObjectId,
          createdComment.id,
        ),
      ])

      return {
        comment: transformCommentToDTO({
          ...createdComment,
          author: createdComment.author,
          quotedComment: createdComment.quotedComment ?? undefined,
          mentions,
          reactions,
        }),
      }
    } else {
      const comments = await this.commentsService.listRootCommentsAsUser(
        req.user,
        folderObjectId,
      )
      const createdComment = comments.find((c) => c.id === comment.id)

      if (!createdComment) {
        throw new Error('Failed to fetch created comment')
      }

      // Fetch mentions and reactions for the created comment
      const [mentions, reactions] = await Promise.all([
        this.commentsService.getMentionsForCommentAsUser(
          req.user,
          folderId,
          folderObjectId,
          createdComment.id,
        ),
        this.commentsService.getReactionsForCommentAsUser(
          req.user,
          folderId,
          folderObjectId,
          createdComment.id,
        ),
      ])

      return {
        comment: transformCommentToDTO({
          ...createdComment,
          author: createdComment.author,
          mentions,
          reactions,
        }),
      }
    }
  }

  /**
   * Get a full comment thread.
   */
  @Get('/:folderId/objects/:folderObjectId/comments/:rootId/thread')
  @AuthGuardConfig({
    allowedActors: [AllowedActor.USER, AllowedActor.APP_USER],
  })
  @ApiOperation({ summary: 'Get a comment thread' })
  @ApiOkResponse({
    description: 'Comment thread',
    type: ThreadResponseDTO,
  })
  async getThread(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Param('folderObjectId', ParseUUIDPipe) folderObjectId: string,
    @Param('rootId', ParseUUIDPipe) rootId: string,
  ): Promise<ThreadResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const comments = await this.commentsService.getThreadAsUser(
      req.user,
      rootId,
    )

    const user = req.user
    // Use folderId and folderObjectId from path params (already validated by getThreadAsUser)
    // Fetch mentions and reactions for all comments
    const commentsWithData = await Promise.all(
      comments.map(async (comment) => {
        const [mentions, reactions] = await Promise.all([
          this.commentsService.getMentionsForCommentAsUser(
            user,
            folderId,
            folderObjectId,
            comment.id,
          ),
          this.commentsService.getReactionsForCommentAsUser(
            user,
            folderId,
            folderObjectId,
            comment.id,
          ),
        ])

        return transformCommentToDTO({
          ...comment,
          author: comment.author,
          quotedComment: comment.quotedComment ?? undefined,
          mentions,
          reactions,
        })
      }),
    )

    return {
      comments: commentsWithData,
    }
  }

  /**
   * Delete a comment (soft delete).
   */
  @Delete('/:folderId/objects/:folderObjectId/comments/:commentId')
  @AuthGuardConfig({
    allowedActors: [AllowedActor.USER, AllowedActor.APP_USER],
  })
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiOkResponse({
    description: 'Comment deleted',
    type: DeleteCommentResponseDTO,
  })
  async deleteComment(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Param('folderObjectId', ParseUUIDPipe) folderObjectId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ): Promise<DeleteCommentResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }

    await this.commentsService.deleteCommentAsUser(
      req.user,
      folderId,
      commentId,
    )
    return { success: true }
  }

  /**
   * Add a reaction to a comment.
   */
  @Post('/:folderId/objects/:folderObjectId/comments/:commentId/reactions')
  @AuthGuardConfig({
    allowedActors: [AllowedActor.USER, AllowedActor.APP_USER],
  })
  @ApiOperation({ summary: 'Add a reaction to a comment' })
  @ApiCreatedResponse({
    description: 'Reaction added',
  })
  async addReaction(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Param('folderObjectId', ParseUUIDPipe) folderObjectId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: AddReactionDTO,
  ): Promise<{ success: true }> {
    if (!req.user) {
      throw new UnauthorizedException()
    }

    await this.reactionService.addReactionAsUser(
      req.user,
      folderId,
      folderObjectId,
      commentId,
      dto.emoji,
    )
    return { success: true }
  }

  /**
   * Remove a reaction from a comment.
   */
  @Delete(
    '/:folderId/objects/:folderObjectId/comments/:commentId/reactions/:emoji',
  )
  @AuthGuardConfig({
    allowedActors: [AllowedActor.USER, AllowedActor.APP_USER],
  })
  @ApiOperation({ summary: 'Remove a reaction from a comment' })
  @ApiOkResponse({
    description: 'Reaction removed',
  })
  async removeReaction(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Param('folderObjectId', ParseUUIDPipe) folderObjectId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Param('emoji') emoji: string,
  ): Promise<{ success: true }> {
    if (!req.user) {
      throw new UnauthorizedException()
    }

    await this.reactionService.removeReactionAsUser(
      req.user,
      folderId,
      folderObjectId,
      commentId,
      emoji,
    )
    return { success: true }
  }
}
