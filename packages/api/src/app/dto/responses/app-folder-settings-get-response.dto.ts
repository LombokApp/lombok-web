import { createZodDto } from 'nestjs-zod'
import { folderAppSettingsSchema } from 'src/app/dto/app-folder-settings.dto'
import { z } from 'zod'

export const appFolderSettingsGetResponseSchema = z.object({
  settings: z.record(z.string(), folderAppSettingsSchema),
})

export class AppFolderSettingsGetResponseDTO extends createZodDto(
  appFolderSettingsGetResponseSchema,
) {}
