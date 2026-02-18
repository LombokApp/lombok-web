import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import express from 'express'
import { ZodValidationPipe } from 'nestjs-zod'
import { AuthGuard } from 'src/auth/guards/auth.guard'

import { CreateMcpTokenInputDTO } from './dto/create-mcp-token-input.dto'
import {
  McpFolderSettingsInputDTO,
  McpUserSettingsInputDTO,
} from './dto/mcp-settings-input.dto'
import { McpSettingsService } from './services/mcp-settings.service'
import { McpTokenService } from './services/mcp-token.service'

@Controller('api/v1')
@UseGuards(AuthGuard)
@UsePipes(ZodValidationPipe)
export class McpApiController {
  constructor(
    private readonly mcpTokenService: McpTokenService,
    private readonly mcpSettingsService: McpSettingsService,
  ) {}

  // --- Token endpoints ---

  @Post('user/mcp/tokens')
  async createToken(
    @Req() req: express.Request,
    @Body() input: CreateMcpTokenInputDTO,
  ) {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    return this.mcpTokenService.createMcpToken(req.user.id, input.clientName)
  }

  @Get('user/mcp/tokens')
  async listTokens(@Req() req: express.Request) {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    return this.mcpTokenService.listMcpTokens(req.user.id)
  }

  @Delete('user/mcp/tokens/:tokenId')
  async revokeToken(
    @Req() req: express.Request,
    @Param('tokenId') tokenId: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    await this.mcpTokenService.revokeMcpToken(req.user.id, tokenId)
    return { success: true }
  }

  // --- User MCP settings endpoints ---

  @Get('user/mcp/settings')
  async getUserSettings(@Req() req: express.Request) {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const settings = await this.mcpSettingsService.getUserSettings(req.user.id)
    return (
      settings ?? {
        canRead: null,
        canWrite: null,
        canDelete: null,
        canMove: null,
      }
    )
  }

  @Put('user/mcp/settings')
  async updateUserSettings(
    @Req() req: express.Request,
    @Body() input: McpUserSettingsInputDTO,
  ) {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    return this.mcpSettingsService.upsertUserSettings(req.user.id, input)
  }

  // --- Folder MCP settings endpoints ---

  @Get('folders/:folderId/mcp/settings')
  async getFolderSettings(
    @Req() req: express.Request,
    @Param('folderId') folderId: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const settings = await this.mcpSettingsService.getFolderSettings(
      req.user.id,
      folderId,
    )
    return (
      settings ?? {
        canRead: null,
        canWrite: null,
        canDelete: null,
        canMove: null,
      }
    )
  }

  @Put('folders/:folderId/mcp/settings')
  async updateFolderSettings(
    @Req() req: express.Request,
    @Param('folderId') folderId: string,
    @Body() input: McpFolderSettingsInputDTO,
  ) {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    return this.mcpSettingsService.upsertFolderSettings(
      req.user.id,
      folderId,
      input,
    )
  }

  @Delete('folders/:folderId/mcp/settings')
  async deleteFolderSettings(
    @Req() req: express.Request,
    @Param('folderId') folderId: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    await this.mcpSettingsService.deleteFolderSettings(req.user.id, folderId)
    return { success: true }
  }
}
