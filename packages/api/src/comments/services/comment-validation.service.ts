import { BadRequestException, Injectable } from '@nestjs/common'

import { CommentAnchor } from '../entities/comment.entity'

@Injectable()
export class CommentValidationService {
  /**
   * Validates that a root comment anchor is valid if provided
   */
  validateRootCommentAnchor(anchor: CommentAnchor | null): void {
    // Anchor is optional - if null, it's implicitly anchored to the top-level object
    if (!anchor) {
      return
    }

    // Validate anchor structure based on type
    switch (anchor.type) {
      case 'image_point':
        if (
          typeof anchor.x !== 'number' ||
          typeof anchor.y !== 'number' ||
          anchor.x < 0 ||
          anchor.x > 1 ||
          anchor.y < 0 ||
          anchor.y > 1
        ) {
          throw new BadRequestException(
            'Image point anchors must have x and y values between 0.0 and 1.0',
          )
        }
        break
      case 'video_point':
        if (typeof anchor.t !== 'number' || anchor.t < 0) {
          throw new BadRequestException(
            'Video point anchors must have a non-negative t value',
          )
        }
        if (
          anchor.x !== undefined &&
          (typeof anchor.x !== 'number' || anchor.x < 0 || anchor.x > 1)
        ) {
          throw new BadRequestException(
            'Video point anchor x must be between 0.0 and 1.0 if provided',
          )
        }
        if (
          anchor.y !== undefined &&
          (typeof anchor.y !== 'number' || anchor.y < 0 || anchor.y > 1)
        ) {
          throw new BadRequestException(
            'Video point anchor y must be between 0.0 and 1.0 if provided',
          )
        }
        break
      case 'audio_point':
        if (typeof anchor.t !== 'number' || anchor.t < 0) {
          throw new BadRequestException(
            'Audio point anchors must have a non-negative t value',
          )
        }
        break
      default: {
        // TypeScript exhaustiveness check - this should never happen
        const _exhaustive: never = anchor
        throw new BadRequestException(`Unknown anchor type`)
      }
    }
  }

  /**
   * Validates that quote_id is in the same thread
   * This method should be called with the quoted comment already fetched
   */
  validateQuoteInSameThread(
    quotedCommentRootId: string | null,
    threadRootId: string | null,
  ): void {
    // If quoted comment is a root comment, its root_id is null, so compare IDs
    // If quoted comment is a reply, compare root_ids
    // The root comment itself can be quoted (quotedCommentRootId would be null, threadRootId would be null)
    if (quotedCommentRootId !== threadRootId) {
      throw new BadRequestException(
        'Quote must reference a comment in the same thread',
      )
    }
  }
}
