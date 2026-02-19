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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { ZodValidationPipe } from 'nestjs-zod'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { ApiStandardErrorResponses } from 'src/shared/decorators/api-standard-error-responses.decorator'

import { CreateMcpTokenInputDTO } from './dto/create-mcp-token-input.dto'
import {
  McpFolderSettingsInputDTO,
  McpUserSettingsInputDTO,
} from './dto/mcp-settings-input.dto'
import { CreateMcpTokenResponseDTO } from './dto/responses/create-mcp-token-response.dto'
import { McpSettingsResponseDTO } from './dto/responses/mcp-settings-response.dto'
import { McpSuccessResponseDTO } from './dto/responses/mcp-success-response.dto'
import { McpTokenListResponseDTO } from './dto/responses/mcp-token-list-response.dto'
import { McpSettingsService } from './services/mcp-settings.service'
import { McpTokenService } from './services/mcp-token.service'

@Controller('api/v1')
@ApiTags('MCP')
@UseGuards(AuthGuard)
@UsePipes(ZodValidationPipe)
@ApiBearerAuth()
@ApiStandardErrorResponses()
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
  ): Promise<CreateMcpTokenResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const result = await this.mcpTokenService.createMcpToken(
      req.user.id,
      input.clientName,
    )
    return {
      tokenId: result.tokenId,
      rawToken: result.rawToken,
      clientName: result.clientName,
      createdAt: result.createdAt.toISOString(),
    }
  }

  @Get('user/mcp/tokens')
  async listTokens(
    @Req() req: express.Request,
  ): Promise<McpTokenListResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const tokens = await this.mcpTokenService.listMcpTokens(req.user.id)
    return {
      tokens: tokens.map((t) => ({
        id: t.id,
        clientName: t.clientName,
        createdAt: t.createdAt.toISOString(),
        lastUsedAt: t.lastUsedAt,
      })),
    }
  }

  @Delete('user/mcp/tokens/:tokenId')
  async revokeToken(
    @Req() req: express.Request,
    @Param('tokenId') tokenId: string,
  ): Promise<McpSuccessResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    await this.mcpTokenService.revokeMcpToken(req.user.id, tokenId)
    return { success: true }
  }

  // --- User MCP settings endpoints ---

  @Get('user/mcp/settings')
  async getUserMcpSettings(
    @Req() req: express.Request,
  ): Promise<McpSettingsResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const settings = await this.mcpSettingsService.getUserSettings(req.user.id)
    return {
      canRead: settings?.canRead ?? null,
      canWrite: settings?.canWrite ?? null,
      canDelete: settings?.canDelete ?? null,
      canMove: settings?.canMove ?? null,
    }
  }

  @Put('user/mcp/settings')
  async updateUserMcpSettings(
    @Req() req: express.Request,
    @Body() input: McpUserSettingsInputDTO,
  ): Promise<McpSettingsResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const result = await this.mcpSettingsService.upsertUserSettings(
      req.user.id,
      input,
    )
    return {
      canRead: result.canRead,
      canWrite: result.canWrite,
      canDelete: result.canDelete,
      canMove: result.canMove,
    }
  }

  // --- Folder MCP settings endpoints ---

  @Get('folders/:folderId/mcp/settings')
  async getFolderMcpSettings(
    @Req() req: express.Request,
    @Param('folderId') folderId: string,
  ): Promise<McpSettingsResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const settings = await this.mcpSettingsService.getFolderSettings(
      req.user.id,
      folderId,
    )
    return {
      canRead: settings?.canRead ?? null,
      canWrite: settings?.canWrite ?? null,
      canDelete: settings?.canDelete ?? null,
      canMove: settings?.canMove ?? null,
    }
  }

  @Put('folders/:folderId/mcp/settings')
  async updateFolderSettings(
    @Req() req: express.Request,
    @Param('folderId') folderId: string,
    @Body() input: McpFolderSettingsInputDTO,
  ): Promise<McpSettingsResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const result = await this.mcpSettingsService.upsertFolderSettings(
      req.user.id,
      folderId,
      input,
    )
    return {
      canRead: result.canRead,
      canWrite: result.canWrite,
      canDelete: result.canDelete,
      canMove: result.canMove,
    }
  }

  @Delete('folders/:folderId/mcp/settings')
  async deleteFolderSettings(
    @Req() req: express.Request,
    @Param('folderId') folderId: string,
  ): Promise<McpSuccessResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    await this.mcpSettingsService.deleteFolderSettings(req.user.id, folderId)
    return { success: true }
  }
}
