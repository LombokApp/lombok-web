import { Injectable } from '@nestjs/common'
import { or, sql } from 'drizzle-orm'
import { OrmService } from 'src/orm/orm.service'
import { usersTable } from 'src/users/entities/user.entity'

import { commentMentionsTable } from '../entities/comment-mention.entity'

@Injectable()
export class CommentMentionService {
  constructor(private readonly ormService: OrmService) {}

  /**
   * Extract @username mentions from comment content
   * Matches patterns like @username, @user_name, @user-name, etc.
   */
  extractMentions(content: string): string[] {
    // Match @ followed by alphanumeric characters, underscores, or hyphens
    // Username must start with a letter or number
    const mentionRegex = /@([a-zA-Z0-9][a-zA-Z0-9_-]*)/g
    const matches = content.matchAll(mentionRegex)
    const usernames = new Set<string>()

    for (const match of matches) {
      const username = match[1]
      if (username) {
        usernames.add(username.toLowerCase())
      }
    }

    return Array.from(usernames)
  }

  /**
   * Look up user IDs for given usernames
   * Uses case-insensitive matching
   */
  async lookupUsersByUsernames(
    usernames: string[],
  ): Promise<Map<string, string>> {
    if (usernames.length === 0) {
      return new Map()
    }

    // Query all usernames at once using case-insensitive comparison
    // Build OR conditions for each username with lowercase comparison
    const conditions = usernames.map(
      (username) =>
        sql`lower(${usersTable.username}) = ${username.toLowerCase()}`,
    )

    const users = await this.ormService.db
      .select({
        id: usersTable.id,
        username: usersTable.username,
      })
      .from(usersTable)
      .where(or(...conditions))

    const userMap = new Map<string, string>()
    for (const user of users) {
      // Match the username case-insensitively
      const matchedUsername = usernames.find(
        (u) => u.toLowerCase() === user.username.toLowerCase(),
      )
      if (matchedUsername) {
        userMap.set(matchedUsername.toLowerCase(), user.id)
      }
    }

    return userMap
  }

  /**
   * Create mention records for a comment
   */
  async createMentions(commentId: string, userIds: string[]): Promise<void> {
    if (userIds.length === 0) {
      return
    }

    // Insert mentions (ignore duplicates due to primary key constraint)
    const mentions = userIds.map((userId) => ({
      commentId,
      userId,
    }))

    await this.ormService.db
      .insert(commentMentionsTable)
      .values(mentions)
      .onConflictDoNothing()
  }

  /**
   * Process mentions from comment content and create mention records
   */
  async processMentions(commentId: string, content: string): Promise<void> {
    const usernames = this.extractMentions(content)
    if (usernames.length === 0) {
      return
    }

    const userMap = await this.lookupUsersByUsernames(usernames)
    const userIds = Array.from(userMap.values())

    if (userIds.length > 0) {
      await this.createMentions(commentId, userIds)
    }
  }
}
