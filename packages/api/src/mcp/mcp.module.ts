import { forwardRef, Module } from '@nestjs/common'
import { AuthModule } from 'src/auth/auth.module'
import { FoldersModule } from 'src/folders/folders.module'
import { StorageModule } from 'src/storage/storage.module'
import { UsersModule } from 'src/users/users.module'

import { McpApiController } from './mcp-api.controller'
import { McpController } from './mcp.controller'
import { McpTokenGuard } from './mcp-token.guard'
import { McpToolsService } from './mcp-tools.service'
import { McpPermissionsService } from './services/mcp-permissions.service'
import { McpSettingsService } from './services/mcp-settings.service'
import { McpTokenService } from './services/mcp-token.service'

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
    forwardRef(() => FoldersModule),
    StorageModule,
  ],
  controllers: [McpController, McpApiController],
  providers: [
    McpTokenService,
    McpPermissionsService,
    McpSettingsService,
    McpToolsService,
    McpTokenGuard,
  ],
  exports: [McpTokenService, McpPermissionsService, McpSettingsService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class McpModule {}
