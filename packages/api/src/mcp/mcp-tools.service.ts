import { SignedURLsRequestMethod } from '@lombokapp/types'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { Injectable } from '@nestjs/common'
import { createS3PresignedUrls } from 'src/storage/s3.utils'
import type { User } from 'src/users/entities/user.entity'
import { z } from 'zod'

import { FolderService } from '../folders/services/folder.service'
import { McpPermissionsService } from './services/mcp-permissions.service'

@Injectable()
export class McpToolsService {
  constructor(
    private readonly folderService: FolderService,
    private readonly mcpPermissionsService: McpPermissionsService,
  ) {}

  registerTools(server: McpServer, user: User): void {
    // 1. list_folders
    server.registerTool(
      'list_folders',
      {
        description: 'List all folders accessible to the user',
        inputSchema: {},
      },
      async () => {
        try {
          const { result } = await this.folderService.listFoldersAsUser(
            user,
            {},
          )
          const folders = result.map(({ folder }) => ({
            id: folder.id,
            name: folder.name,
            ownerId: folder.ownerId,
            createdAt: folder.createdAt,
            updatedAt: folder.updatedAt,
          }))
          return {
            content: [
              { type: 'text' as const, text: JSON.stringify(folders, null, 2) },
            ],
          }
        } catch (e: unknown) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${e instanceof Error ? e.message : String(e)}`,
              },
            ],
            isError: true,
          }
        }
      },
    )

    // 2. list_objects
    server.registerTool(
      'list_objects',
      {
        description: 'List objects in a folder',
        inputSchema: {
          folder_id: z.uuid(),
          prefix: z.string().optional(),
        },
      },
      async ({ folder_id, prefix: _prefix }) => {
        try {
          const permissions =
            await this.mcpPermissionsService.resolveEffectivePermissions(
              user.id,
              folder_id,
            )
          if (!permissions.canRead) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Permission denied: read not allowed for this folder',
                },
              ],
              isError: true,
            }
          }

          const { result } = await this.folderService.listFolderObjectsAsUser(
            user,
            {
              folderId: folder_id,
            },
          )

          const objects = result.map((obj) => ({
            objectKey: obj.objectKey,
            filename: obj.filename,
            sizeBytes: obj.sizeBytes,
            mimeType: obj.mimeType,
            mediaType: obj.mediaType,
            eTag: obj.eTag,
            createdAt: obj.createdAt,
            updatedAt: obj.updatedAt,
          }))

          return {
            content: [
              { type: 'text' as const, text: JSON.stringify(objects, null, 2) },
            ],
          }
        } catch (e: unknown) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${e instanceof Error ? e.message : String(e)}`,
              },
            ],
            isError: true,
          }
        }
      },
    )

    // 3. download_file
    server.registerTool(
      'download_file',
      {
        description: 'Get a presigned URL to download a file',
        inputSchema: {
          folder_id: z.uuid(),
          object_key: z.string(),
        },
      },
      async ({ folder_id, object_key }) => {
        try {
          const permissions =
            await this.mcpPermissionsService.resolveEffectivePermissions(
              user.id,
              folder_id,
            )
          if (!permissions.canRead) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Permission denied: read not allowed for this folder',
                },
              ],
              isError: true,
            }
          }

          const { folder } = await this.folderService.getFolderAsUser(
            user,
            folder_id,
          )
          const contentLocation = folder.contentLocation

          const prefix = contentLocation.prefix
          const absoluteObjectKey =
            prefix && prefix.length > 0
              ? `${prefix}${prefix.endsWith('/') ? '' : '/'}${object_key}`
              : object_key

          const [url] = createS3PresignedUrls([
            {
              endpoint: contentLocation.endpoint,
              region: contentLocation.region,
              accessKeyId: contentLocation.accessKeyId,
              secretAccessKey: contentLocation.secretAccessKey,
              bucket: contentLocation.bucket,
              objectKey: absoluteObjectKey,
              method: SignedURLsRequestMethod.GET,
              expirySeconds: 300,
            },
          ])

          return {
            content: [{ type: 'text' as const, text: url ?? '' }],
          }
        } catch (e: unknown) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${e instanceof Error ? e.message : String(e)}`,
              },
            ],
            isError: true,
          }
        }
      },
    )
  }
}
