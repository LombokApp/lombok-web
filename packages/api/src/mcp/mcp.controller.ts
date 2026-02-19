import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common'
import type { Request, Response } from 'express'

import { McpTokenGuard } from './mcp-token.guard'
import { McpToolsService } from './mcp-tools.service'

const MCP_PATH = '/api/mcp'

@Controller()
@UseGuards(McpTokenGuard)
export class McpController {
  constructor(private readonly mcpToolsService: McpToolsService) {}

  @Post(MCP_PATH)
  @Get(MCP_PATH)
  async handleMcp(@Req() req: Request, @Res() res: Response): Promise<void> {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    })

    const server = new McpServer({
      name: 'lombok-mcp',
      version: '1.0.0',
    })

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.mcpToolsService.registerTools(server, req.user!)
    await server.connect(transport)
    await transport.handleRequest(req, res, req.body as Record<string, unknown>)
  }
}
