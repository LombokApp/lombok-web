import { CopyObjectCommand } from '@aws-sdk/client-s3'
import { SignedURLsRequestMethod } from '@lombokapp/types'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { Injectable } from '@nestjs/common'
import { configureS3Client, S3Service } from 'src/storage/s3.service'
import { createS3PresignedUrls } from 'src/storage/s3.utils'
import type { User } from 'src/users/entities/user.entity'
import { z } from 'zod'

import { FolderService } from '../folders/services/folder.service'
import { McpPermissionsService } from './services/mcp-permissions.service'

@Injectable()
export class McpToolsService {
  constructor(
    private readonly folderService: FolderService,
    private readonly s3Service: S3Service,
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

    // 4. upload_file
    server.registerTool(
      'upload_file',
      {
        description: 'Get a presigned URL to upload a file',
        inputSchema: {
          folder_id: z.uuid(),
          object_key: z.string(),
          content_type: z.string().optional(),
        },
      },
      async ({ folder_id, object_key }) => {
        try {
          const permissions =
            await this.mcpPermissionsService.resolveEffectivePermissions(
              user.id,
              folder_id,
            )
          if (!permissions.canWrite) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Permission denied: write not allowed for this folder',
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
              method: SignedURLsRequestMethod.PUT,
              expirySeconds: 3600,
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

    // 5. delete_object
    server.registerTool(
      'delete_object',
      {
        description: 'Delete an object from a folder',
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
          if (!permissions.canDelete) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Permission denied: delete not allowed for this folder',
                },
              ],
              isError: true,
            }
          }

          await this.folderService.deleteFolderObjectAsUser(user, {
            folderId: folder_id,
            objectKey: object_key,
          })

          return {
            content: [
              {
                type: 'text' as const,
                text: `Successfully deleted object: ${object_key}`,
              },
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

    // 6. move_object
    server.registerTool(
      'move_object',
      {
        description: 'Move or rename an object within or between folders',
        inputSchema: {
          folder_id: z.uuid(),
          source_key: z.string(),
          destination_key: z.string(),
          destination_folder_id: z.uuid().optional(),
        },
      },
      async ({
        folder_id,
        source_key,
        destination_key,
        destination_folder_id,
      }) => {
        try {
          const destFolderId = destination_folder_id ?? folder_id

          // Check move permission on source folder
          const sourcePermissions =
            await this.mcpPermissionsService.resolveEffectivePermissions(
              user.id,
              folder_id,
            )
          if (!sourcePermissions.canMove) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Permission denied: move not allowed for source folder',
                },
              ],
              isError: true,
            }
          }

          // Check write permission on destination folder if different
          if (destFolderId !== folder_id) {
            const destPermissions =
              await this.mcpPermissionsService.resolveEffectivePermissions(
                user.id,
                destFolderId,
              )
            if (!destPermissions.canWrite) {
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: 'Permission denied: write not allowed for destination folder',
                  },
                ],
                isError: true,
              }
            }
          }

          const { folder: sourceFolder } =
            await this.folderService.getFolderAsUser(user, folder_id)
          const sourceLocation = sourceFolder.contentLocation

          const sourcePrefix = sourceLocation.prefix
          const absoluteSourceKey =
            sourcePrefix && sourcePrefix.length > 0
              ? `${sourcePrefix}${sourcePrefix.endsWith('/') ? '' : '/'}${source_key}`
              : source_key

          let destLocation = sourceLocation

          if (destFolderId !== folder_id) {
            const { folder: destFolder } =
              await this.folderService.getFolderAsUser(user, destFolderId)
            destLocation = destFolder.contentLocation
          }

          const destPrefix = destLocation.prefix
          const absoluteDestKey =
            destPrefix && destPrefix.length > 0
              ? `${destPrefix}${destPrefix.endsWith('/') ? '' : '/'}${destination_key}`
              : destination_key

          // Copy object to destination
          const s3Client = configureS3Client({
            accessKeyId: sourceLocation.accessKeyId,
            secretAccessKey: sourceLocation.secretAccessKey,
            endpoint: sourceLocation.endpoint,
            region: sourceLocation.region,
          })

          await s3Client.send(
            new CopyObjectCommand({
              Bucket: destLocation.bucket,
              CopySource: `${sourceLocation.bucket}/${absoluteSourceKey}`,
              Key: absoluteDestKey,
            }),
          )

          // Delete original object via S3Service (uses presigned URL approach)
          await this.s3Service.s3DeleteBucketObject({
            accessKeyId: sourceLocation.accessKeyId,
            secretAccessKey: sourceLocation.secretAccessKey,
            endpoint: sourceLocation.endpoint,
            region: sourceLocation.region,
            bucket: sourceLocation.bucket,
            objectKey: absoluteSourceKey,
          })

          return {
            content: [
              {
                type: 'text' as const,
                text: `Successfully moved ${source_key} to ${destination_key}`,
              },
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
  }
}
