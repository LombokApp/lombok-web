import { Module } from '@nestjs/common'
import { FoldersModule } from 'src/folders/folders.module'
import { OrmModule } from 'src/orm/orm.module'

import { CommentsController } from './controllers/comments.controller'
import { CommentMentionService } from './services/comment-mention.service'
import { CommentReactionService } from './services/comment-reaction.service'
import { CommentValidationService } from './services/comment-validation.service'
import { CommentsService } from './services/comments.service'

@Module({
  imports: [OrmModule, FoldersModule],
  controllers: [CommentsController],
  providers: [
    CommentsService,
    CommentValidationService,
    CommentMentionService,
    CommentReactionService,
  ],
  exports: [CommentsService, CommentReactionService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CommentsModule {}
